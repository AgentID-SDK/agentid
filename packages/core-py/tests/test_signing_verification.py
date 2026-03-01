"""Tests for signing and verification."""

import base64

import pytest

from agentid.identity import generate_keypair, get_agent_id
from agentid.manifest import create_manifest
from agentid.signing import sign_manifest, sign_message
from agentid.types import Capability, TrustLevel
from agentid.verification import verify_signed_manifest, verify_signed_message


def _make_signed():
    kp = generate_keypair()
    m = create_manifest(
        agent_id=get_agent_id(kp.public_key),
        name="TestAgent",
        version="1.0.0",
        capabilities=[
            Capability(
                id="payments:send",
                description="Send payments",
            )
        ],
        expires_at="2030-01-01T00:00:00Z",
    )
    signed = sign_manifest(m, kp)
    return kp, m, signed


def test_sign_and_verify_manifest():
    kp, m, signed = _make_signed()
    result = verify_signed_manifest(signed)
    assert result.valid is True
    assert result.errors == []
    assert result.trust_level == TrustLevel.SELF_SIGNED
    assert result.manifest is not None
    assert result.manifest.name == "TestAgent"


def test_reject_tampered_payload():
    kp, m, signed = _make_signed()
    signed.payload = signed.payload.replace("TestAgent", "TamperedAgent")
    result = verify_signed_manifest(signed)
    assert result.valid is False
    assert any("Signature" in e for e in result.errors)


def test_reject_tampered_signature():
    kp, m, signed = _make_signed()
    sig_bytes = bytearray(base64.b64decode(signed.signature))
    sig_bytes[0] ^= 0xFF
    signed.signature = base64.b64encode(bytes(sig_bytes)).decode()
    result = verify_signed_manifest(signed)
    assert result.valid is False


def test_reject_wrong_key():
    kp, m, signed = _make_signed()
    wrong_kp = generate_keypair()
    wrong_signed = sign_manifest(m, wrong_kp)
    result = verify_signed_manifest(wrong_signed)
    assert result.valid is False
    assert any("does not match" in e for e in result.errors)


def test_detect_expired_manifest():
    kp = generate_keypair()
    m = create_manifest(
        agent_id=get_agent_id(kp.public_key),
        name="TestAgent",
        version="1.0.0",
        capabilities=[],
        expires_at="2020-01-01T00:00:00Z",
    )
    signed = sign_manifest(m, kp)
    result = verify_signed_manifest(signed)
    assert result.valid is False
    assert result.expired is True


def test_detect_revoked_key():
    kp, m, signed = _make_signed()
    agent_id = get_agent_id(kp.public_key)
    result = verify_signed_manifest(signed, revoked_key_ids={agent_id})
    assert result.valid is False
    assert result.revoked is True


def test_sign_and_verify_message():
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    signed = sign_message("hello", "test-nonce", kp, "sha256:abc")
    result = verify_signed_message(signed, agent_id)
    assert result.valid is True
    assert result.errors == []


def test_reject_wrong_agent_id_message():
    kp = generate_keypair()
    signed = sign_message("hello", "nonce", kp, "ref")
    result = verify_signed_message(signed, "aid_ed25519_wrong")
    assert result.valid is False
    assert any("mismatch" in e for e in result.errors)


def test_reject_tampered_nonce():
    kp = generate_keypair()
    signed = sign_message("hello", "nonce", kp, "ref")
    signed.nonce = "tampered"
    result = verify_signed_message(signed)
    assert result.valid is False
