from __future__ import annotations

import base64
from datetime import datetime, timezone

from nacl.signing import SigningKey

from agentid.identity import get_agent_id
from agentid.manifest import canonicalize_manifest
from agentid.types import AgentManifest, Keypair, SignedManifest, SignedMessage


def sign_manifest(manifest: AgentManifest, keypair: Keypair) -> SignedManifest:
    payload = canonicalize_manifest(manifest)
    signing_key = SigningKey(keypair.private_key)
    signed = signing_key.sign(payload.encode("utf-8"))
    signature = base64.b64encode(signed.signature).decode("ascii")

    return SignedManifest(
        payload=payload,
        signature=signature,
        key_id=get_agent_id(keypair.public_key),
        signed_at=datetime.now(timezone.utc).isoformat(),
    )


def sign_message(
    payload: str,
    nonce: str,
    keypair: Keypair,
    manifest_ref: str,
) -> SignedMessage:
    message = f"{nonce}:{payload}:{manifest_ref}"
    signing_key = SigningKey(keypair.private_key)
    signed = signing_key.sign(message.encode("utf-8"))
    signature = base64.b64encode(signed.signature).decode("ascii")

    return SignedMessage(
        payload=base64.b64encode(payload.encode("utf-8")).decode("ascii"),
        nonce=nonce,
        agent_id=get_agent_id(keypair.public_key),
        manifest_ref=manifest_ref,
        signature=signature,
        signed_at=datetime.now(timezone.utc).isoformat(),
    )
