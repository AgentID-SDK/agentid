"""Manifest and message verification."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from agentid.types import (
    AgentManifest,
    Capability,
    Constraint,
    Operator,
    RevocationStatement,
    SignedManifest,
    SignedMessage,
    TrustLevel,
    VerificationResult,
)
from agentid.utils import decode_base58, decode_base64, decode_base64_as_string


def verify_signed_manifest(
    signed_manifest: SignedManifest,
    *,
    revoked_key_ids: Optional[set[str]] = None,
    now: Optional[datetime] = None,
    verify_domain_proof: bool = False,
    domain_proof_verifier: Optional[Callable[[str, str], bool]] = None,
) -> VerificationResult:
    """Verify a signed manifest: check signature, expiry, and revocation status."""
    errors: list[str] = []
    now = now or datetime.now(timezone.utc)

    public_key_bytes = _extract_public_key(signed_manifest.key_id)
    if public_key_bytes is None:
        return VerificationResult(
            valid=False,
            trust_level=TrustLevel.SELF_SIGNED,
            agent_id=signed_manifest.key_id,
            expired=False,
            revoked=False,
            errors=["Invalid key_id format: cannot extract public key"],
        )

    payload_bytes = signed_manifest.payload.encode("utf-8")
    signature_bytes = decode_base64(signed_manifest.signature)

    try:
        verify_key = VerifyKey(public_key_bytes)
        verify_key.verify(payload_bytes, signature_bytes)
        signature_valid = True
    except (BadSignatureError, Exception):
        signature_valid = False

    if not signature_valid:
        errors.append("Signature verification failed")

    manifest: Optional[AgentManifest] = None
    try:
        raw = json.loads(signed_manifest.payload)
        manifest = _dict_to_manifest(raw)
    except Exception:
        errors.append("Failed to parse manifest payload as JSON")

    if manifest and manifest.agent_id != signed_manifest.key_id:
        errors.append(
            f"Manifest agent_id ({manifest.agent_id}) does not match "
            f"signing key_id ({signed_manifest.key_id})"
        )

    expired = False
    if manifest and manifest.expires_at:
        try:
            expiry = datetime.fromisoformat(manifest.expires_at.replace("Z", "+00:00"))
            expired = expiry < now
        except ValueError:
            pass
    if expired:
        errors.append(f"Manifest expired at {manifest.expires_at}")  # type: ignore[union-attr]

    revoked = bool(revoked_key_ids and signed_manifest.key_id in revoked_key_ids)
    if revoked:
        errors.append("Key has been revoked")

    trust_level = TrustLevel.SELF_SIGNED
    if (
        manifest
        and manifest.operator
        and manifest.operator.domain
        and manifest.operator.domain_proof
        and verify_domain_proof
        and domain_proof_verifier
    ):
        try:
            domain_verified = domain_proof_verifier(
                manifest.operator.domain, manifest.operator.domain_proof
            )
            if domain_verified:
                trust_level = TrustLevel.DOMAIN_VERIFIED
        except Exception:
            errors.append("Domain proof verification failed")

    return VerificationResult(
        valid=signature_valid and not expired and not revoked and len(errors) == 0,
        trust_level=trust_level,
        agent_id=signed_manifest.key_id,
        expired=expired,
        revoked=revoked,
        errors=errors,
        manifest=manifest,
    )


def verify_signed_message(
    signed_message: SignedMessage,
    expected_agent_id: Optional[str] = None,
) -> VerificationResult:
    """Verify a signed handshake message. Returns a VerificationResult."""
    errors: list[str] = []

    if expected_agent_id and signed_message.agent_id != expected_agent_id:
        errors.append(
            f"Agent ID mismatch: expected {expected_agent_id}, "
            f"got {signed_message.agent_id}"
        )

    public_key_bytes = _extract_public_key(signed_message.agent_id)
    if public_key_bytes is None:
        return VerificationResult(
            valid=False,
            trust_level=TrustLevel.SELF_SIGNED,
            agent_id=signed_message.agent_id,
            expired=False,
            revoked=False,
            errors=["Invalid agent_id format"],
        )

    payload_decoded = decode_base64_as_string(signed_message.payload)
    message = f"{signed_message.nonce}:{payload_decoded}:{signed_message.manifest_ref}"
    message_bytes = message.encode("utf-8")
    signature_bytes = decode_base64(signed_message.signature)

    try:
        verify_key = VerifyKey(public_key_bytes)
        verify_key.verify(message_bytes, signature_bytes)
    except (BadSignatureError, Exception):
        errors.append("Signature verification failed")

    return VerificationResult(
        valid=len(errors) == 0,
        trust_level=TrustLevel.SELF_SIGNED,
        agent_id=signed_message.agent_id,
        expired=False,
        revoked=False,
        errors=errors,
    )


def verify_revocation_signature(statement: RevocationStatement) -> bool:
    """Verify a revocation statement's signature. Returns True if valid."""
    public_key_bytes = _extract_public_key(statement.agent_id)
    if public_key_bytes is None:
        return False

    payload: dict[str, Any] = {
        "type": statement.type,
        "agent_id": statement.agent_id,
        "revoked_key_id": statement.revoked_key_id,
        "revoked_at": statement.revoked_at,
        "reason": statement.reason,
    }

    payload_bytes = json.dumps(payload).encode("utf-8")
    signature_bytes = decode_base64(statement.signature)

    try:
        verify_key = VerifyKey(public_key_bytes)
        verify_key.verify(payload_bytes, signature_bytes)
        return True
    except (BadSignatureError, Exception):
        return False


def _extract_public_key(key_id: str) -> Optional[bytes]:
    prefix = "aid_ed25519_"
    if not key_id.startswith(prefix):
        return None
    encoded = key_id[len(prefix):]
    try:
        return decode_base58(encoded)
    except Exception:
        return None


def _dict_to_manifest(d: dict[str, Any]) -> AgentManifest:
    operator = None
    if d.get("operator"):
        op = d["operator"]
        operator = Operator(
            domain=op.get("domain"),
            contact=op.get("contact"),
            domain_proof=op.get("domain_proof"),
        )

    capabilities = []
    for cap in d.get("capabilities", []):
        constraint = None
        if cap.get("constraints"):
            c = cap["constraints"]
            constraint = Constraint(
                max_amount_usd=c.get("max_amount_usd"),
                require_human_approval_above_usd=c.get("require_human_approval_above_usd"),
                allowed_recipients=c.get("allowed_recipients"),
                rate_limit=c.get("rate_limit"),
                scope=c.get("scope"),
            )
        capabilities.append(Capability(
            id=cap["id"],
            description=cap.get("description", ""),
            constraints=constraint,
        ))

    return AgentManifest(
        manifest_version=d["manifest_version"],
        agent_id=d["agent_id"],
        name=d["name"],
        version=d["version"],
        capabilities=capabilities,
        expires_at=d["expires_at"],
        operator=operator,
        policy_url=d.get("policy_url"),
        metadata=d.get("metadata"),
    )
