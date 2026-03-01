"""Tests for revocation module."""

import json
from pathlib import Path

import pytest

from agentid.identity import generate_keypair, get_agent_id
from agentid.revocation import create_revocation, check_revocation, load_revocation_list
from agentid.verification import verify_revocation_signature


def test_create_revocation():
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "key_compromise", kp)
    assert rev.type == "revocation"
    assert rev.agent_id == agent_id
    assert rev.reason == "key_compromise"
    assert rev.signature


def test_verify_revocation_signature():
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "key_compromise", kp)
    assert verify_revocation_signature(rev) is True


def test_reject_tampered_revocation():
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "key_compromise", kp)
    rev.reason = "tampered"
    assert verify_revocation_signature(rev) is False


def test_check_revocation():
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "test", kp)
    revoked, stmt = check_revocation(agent_id, [rev])
    assert revoked is True
    assert stmt is not None

    not_revoked, _ = check_revocation("aid_ed25519_unknown", [rev])
    assert not_revoked is False


def test_load_revocation_list_verified(tmp_path):
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "test", kp)
    path = str(tmp_path / "revocations.json")
    Path(path).write_text(json.dumps([{
        "type": rev.type,
        "agent_id": rev.agent_id,
        "revoked_key_id": rev.revoked_key_id,
        "revoked_at": rev.revoked_at,
        "reason": rev.reason,
        "signature": rev.signature,
    }]))
    loaded = load_revocation_list(path, verify_signatures=True)
    assert len(loaded) == 1


def test_load_revocation_list_filters_invalid(tmp_path):
    kp = generate_keypair()
    agent_id = get_agent_id(kp.public_key)
    rev = create_revocation(agent_id, agent_id, "test", kp)
    tampered = {
        "type": rev.type,
        "agent_id": rev.agent_id,
        "revoked_key_id": rev.revoked_key_id,
        "revoked_at": rev.revoked_at,
        "reason": "tampered",
        "signature": rev.signature,
    }
    valid = {
        "type": rev.type,
        "agent_id": rev.agent_id,
        "revoked_key_id": rev.revoked_key_id,
        "revoked_at": rev.revoked_at,
        "reason": rev.reason,
        "signature": rev.signature,
    }
    path = str(tmp_path / "revocations.json")
    Path(path).write_text(json.dumps([valid, tampered]))
    loaded = load_revocation_list(path, verify_signatures=True)
    assert len(loaded) == 1
