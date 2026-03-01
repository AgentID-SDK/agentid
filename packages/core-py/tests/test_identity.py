import json
import os
import stat
import tempfile
from pathlib import Path

import pytest

from agentid.identity import generate_keypair, get_agent_id, save_keypair, load_keypair


def test_generate_keypair():
    kp = generate_keypair()
    assert len(kp.public_key) == 32
    assert len(kp.private_key) == 32


def test_generates_unique_keypairs():
    kp1 = generate_keypair()
    kp2 = generate_keypair()
    assert kp1.public_key != kp2.public_key


def test_deterministic_agent_id():
    kp = generate_keypair()
    id1 = get_agent_id(kp.public_key)
    id2 = get_agent_id(kp.public_key)
    assert id1 == id2
    assert id1.startswith("aid_ed25519_")


def test_different_keys_different_ids():
    kp1 = generate_keypair()
    kp2 = generate_keypair()
    assert get_agent_id(kp1.public_key) != get_agent_id(kp2.public_key)


def test_save_and_load_keypair(tmp_path):
    kp = generate_keypair()
    path = str(tmp_path / "key.json")
    save_keypair(kp, path)
    loaded = load_keypair(path)
    assert loaded.public_key == kp.public_key
    assert loaded.private_key == kp.private_key


def test_save_restricted_permissions(tmp_path):
    kp = generate_keypair()
    path = str(tmp_path / "key.json")
    save_keypair(kp, path)
    mode = os.stat(path).st_mode & 0o777
    assert mode == 0o600


def test_save_refuses_overwrite(tmp_path):
    kp = generate_keypair()
    path = str(tmp_path / "key.json")
    save_keypair(kp, path)
    with pytest.raises(FileExistsError, match="already exists"):
        save_keypair(kp, path)


def test_save_allows_overwrite_when_explicit(tmp_path):
    kp1 = generate_keypair()
    kp2 = generate_keypair()
    path = str(tmp_path / "key.json")
    save_keypair(kp1, path)
    save_keypair(kp2, path, overwrite=True)
    loaded = load_keypair(path)
    assert loaded.public_key == kp2.public_key


def test_load_from_env(monkeypatch):
    kp = generate_keypair()
    data = json.dumps({
        "publicKey": kp.public_key.hex(),
        "privateKey": kp.private_key.hex(),
    })
    monkeypatch.setenv("TEST_AGENTID_KEY", data)
    loaded = load_keypair("env:TEST_AGENTID_KEY")
    assert loaded.public_key == kp.public_key


def test_load_missing_env(monkeypatch):
    monkeypatch.delenv("NONEXISTENT_KEY", raising=False)
    with pytest.raises(ValueError, match="not set"):
        load_keypair("env:NONEXISTENT_KEY")


def test_load_invalid_format(tmp_path):
    path = str(tmp_path / "bad.json")
    Path(path).write_text('{"bad": "data"}')
    with pytest.raises(ValueError, match="missing"):
        load_keypair(path)
