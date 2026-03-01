"""Identity management: keypair generation, storage, and agent ID derivation."""

from __future__ import annotations

import json
import os
import stat
from pathlib import Path

from nacl.signing import SigningKey

from agentid.types import Keypair
from agentid.utils import encode_base58


def generate_keypair() -> Keypair:
    """Generate a new Ed25519 keypair."""
    signing_key = SigningKey.generate()
    return Keypair(
        public_key=bytes(signing_key.verify_key),
        private_key=bytes(signing_key),
    )


def get_agent_id(public_key: bytes) -> str:
    """Derive a deterministic agent ID from a public key."""
    encoded = encode_base58(public_key)
    return f"aid_ed25519_{encoded}"


def save_keypair(keypair: Keypair, path: str, *, overwrite: bool = False) -> None:
    """Save a keypair to disk with restricted file permissions (0600).

    Args:
        keypair: The keypair to save.
        path: File path to write to.
        overwrite: If False (default), raises if file already exists.
    """
    data = json.dumps({
        "publicKey": keypair.public_key.hex(),
        "privateKey": keypair.private_key.hex(),
    })
    p = Path(path)
    if not overwrite and p.exists():
        raise FileExistsError(
            f"Key file already exists at {path}. Use overwrite=True to replace it, "
            f"or back up the existing key first."
        )
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, stat.S_IRUSR | stat.S_IWUSR)
    try:
        os.write(fd, data.encode("utf-8"))
    finally:
        os.close(fd)


def load_keypair(source: str) -> Keypair:
    """Load a keypair from a file path or environment variable (prefix with 'env:')."""
    if source.startswith("env:"):
        env_var = source[4:]
        value = os.environ.get(env_var)
        if not value:
            raise ValueError(f"Environment variable {env_var} is not set")
        raw = value
    else:
        raw = Path(source).read_text(encoding="utf-8")

    parsed = json.loads(raw)
    if "publicKey" not in parsed or "privateKey" not in parsed:
        raise ValueError("Invalid keypair format: missing publicKey or privateKey")
    return Keypair(
        public_key=bytes.fromhex(parsed["publicKey"]),
        private_key=bytes.fromhex(parsed["privateKey"]),
    )
