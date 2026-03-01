from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from nacl.signing import SigningKey

from agentid.identity import get_agent_id
from agentid.types import Keypair, RevocationStatement
from agentid.utils import encode_base64


def _canonicalize_revocation_payload(
    agent_id: str,
    revoked_key_id: str,
    revoked_at: str,
    reason: str,
) -> str:
    return json.dumps({
        "type": "revocation",
        "agent_id": agent_id,
        "revoked_key_id": revoked_key_id,
        "revoked_at": revoked_at,
        "reason": reason,
    }, separators=(",", ":"))


def create_revocation(
    agent_id: str,
    revoked_key_id: str,
    reason: str,
    signing_keypair: Keypair,
) -> RevocationStatement:
    revoked_at = datetime.now(timezone.utc).isoformat()
    payload = _canonicalize_revocation_payload(agent_id, revoked_key_id, revoked_at, reason)

    signing_key = SigningKey(signing_keypair.private_key)
    signed = signing_key.sign(payload.encode("utf-8"))
    signature = encode_base64(signed.signature)

    return RevocationStatement(
        type="revocation",
        agent_id=agent_id,
        revoked_key_id=revoked_key_id,
        revoked_at=revoked_at,
        reason=reason,
        signature=signature,
    )


def check_revocation(
    key_id: str,
    revocation_list: list[RevocationStatement],
) -> tuple[bool, Optional[RevocationStatement]]:
    for r in revocation_list:
        if r.revoked_key_id == key_id or r.agent_id == key_id:
            return True, r
    return False, None


def load_revocation_list(
    source: str,
    *,
    verify_signatures: bool = True,
) -> list[RevocationStatement]:
    from agentid.verification import verify_revocation_signature

    raw = Path(source).read_text(encoding="utf-8")
    data = json.loads(raw)

    if not isinstance(data, list):
        raise ValueError("Revocation list must be a JSON array")

    statements = [
        RevocationStatement(
            type=r["type"],
            agent_id=r["agent_id"],
            revoked_key_id=r["revoked_key_id"],
            revoked_at=r["revoked_at"],
            reason=r["reason"],
            signature=r["signature"],
        )
        for r in data
    ]

    if not verify_signatures:
        return statements

    return [s for s in statements if verify_revocation_signature(s)]
