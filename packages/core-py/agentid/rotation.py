from __future__ import annotations

from datetime import datetime, timezone

from nacl.exceptions import BadSignatureError
from nacl.signing import SigningKey, VerifyKey

from agentid.identity import get_agent_id
from agentid.types import Keypair, RotationStatement
from agentid.utils import decode_base58, decode_base64, encode_base64


def create_rotation(old_keypair: Keypair, new_public_key: bytes) -> RotationStatement:
    """The old key signs a delegation statement to the new key."""
    old_key_id = get_agent_id(old_keypair.public_key)
    new_key_id = get_agent_id(new_public_key)
    rotated_at = datetime.now(timezone.utc).isoformat()

    continuity_proof = f"rotate:{old_key_id}:{new_key_id}:{rotated_at}"
    signing_key = SigningKey(old_keypair.private_key)
    signed = signing_key.sign(continuity_proof.encode("utf-8"))

    return RotationStatement(
        type="rotation",
        old_key_id=old_key_id,
        new_key_id=new_key_id,
        rotated_at=rotated_at,
        continuity_proof=continuity_proof,
        signature_by_old_key=encode_base64(signed.signature),
    )


def verify_rotation(statement: RotationStatement) -> tuple[bool, list[str]]:
    errors: list[str] = []

    expected_proof = f"rotate:{statement.old_key_id}:{statement.new_key_id}:{statement.rotated_at}"
    if statement.continuity_proof != expected_proof:
        errors.append("Continuity proof content does not match statement fields")

    old_public_key = _extract_public_key(statement.old_key_id)
    if old_public_key is None:
        return False, ["Cannot extract public key from old_key_id"]

    proof_bytes = statement.continuity_proof.encode("utf-8")
    signature_bytes = decode_base64(statement.signature_by_old_key)

    try:
        verify_key = VerifyKey(old_public_key)
        verify_key.verify(proof_bytes, signature_bytes)
    except (BadSignatureError, Exception):
        errors.append("Signature by old key is invalid")

    return len(errors) == 0, errors


def _extract_public_key(key_id: str) -> bytes | None:
    prefix = "aid_ed25519_"
    if not key_id.startswith(prefix):
        return None
    try:
        return decode_base58(key_id[len(prefix):])
    except Exception:
        return None
