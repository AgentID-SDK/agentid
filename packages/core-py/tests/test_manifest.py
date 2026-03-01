import json
from pathlib import Path

import pytest

from agentid.identity import generate_keypair, get_agent_id
from agentid.manifest import create_manifest, validate_manifest, canonicalize_manifest
from agentid.types import AgentManifest, Capability

VECTORS_PATH = Path(__file__).parent.parent.parent.parent / "spec" / "test-vectors" / "vectors.json"


def _make_manifest():
    kp = generate_keypair()
    return create_manifest(
        agent_id=get_agent_id(kp.public_key),
        name="TestAgent",
        version="1.0.0",
        capabilities=[Capability(id="data:read", description="Read data")],
        expires_at="2030-01-01T00:00:00Z",
    )


def test_create_manifest():
    m = _make_manifest()
    assert m.manifest_version == "0.1"
    assert m.name == "TestAgent"
    assert len(m.capabilities) == 1


def test_reject_missing_fields():
    m = AgentManifest(
        manifest_version="0.1",
        agent_id="",
        name="",
        version="",
        capabilities=[],
        expires_at="",
    )
    errors = validate_manifest(m)
    assert len(errors) > 0, f"Expected validation errors for empty fields, got none"
    assert any("agent_id" in e for e in errors)
    assert any("name" in e for e in errors)


def test_reject_invalid_agent_id():
    m = AgentManifest(
        manifest_version="0.1",
        agent_id="invalid_prefix",
        name="Test",
        version="1.0.0",
        capabilities=[],
        expires_at="2030-01-01T00:00:00Z",
    )
    errors = validate_manifest(m)
    assert any("aid_ed25519_" in e for e in errors)


def test_reject_long_name():
    kp = generate_keypair()
    m = AgentManifest(
        manifest_version="0.1",
        agent_id=get_agent_id(kp.public_key),
        name="x" * 257,
        version="1.0.0",
        capabilities=[],
        expires_at="2030-01-01T00:00:00Z",
    )
    errors = validate_manifest(m)
    assert any("256" in e for e in errors)


def test_canonicalize_deterministic():
    m = _make_manifest()
    c1 = canonicalize_manifest(m)
    c2 = canonicalize_manifest(m)
    assert c1 == c2


def test_canonicalize_sorts_keys():
    m = _make_manifest()
    canonical = canonicalize_manifest(m)
    parsed = json.loads(canonical)
    keys = list(parsed.keys())
    assert keys == sorted(keys)


def test_canonicalize_omits_none():
    m = _make_manifest()
    canonical = canonicalize_manifest(m)
    assert "operator" not in canonical
    assert "policy_url" not in canonical
    assert "metadata" not in canonical


def test_canonicalize_matches_test_vector():
    if not VECTORS_PATH.exists():
        pytest.skip("Test vectors not found")
    vectors = json.loads(VECTORS_PATH.read_text())
    manifest_input = vectors["manifest"]["input"]
    expected = vectors["manifest"]["canonicalized"]

    m = AgentManifest(
        manifest_version=manifest_input["manifest_version"],
        agent_id=manifest_input["agent_id"],
        name=manifest_input["name"],
        version=manifest_input["version"],
        capabilities=[
            Capability(
                id=c["id"],
                description=c["description"],
                constraints=None,
            )
            if "constraints" not in c
            else Capability(
                id=c["id"],
                description=c["description"],
            )
            for c in manifest_input["capabilities"]
        ],
        expires_at=manifest_input["expires_at"],
    )

    from agentid.types import Constraint

    for i, c in enumerate(manifest_input["capabilities"]):
        if "constraints" in c:
            m.capabilities[i].constraints = Constraint(
                max_amount_usd=c["constraints"].get("max_amount_usd"),
            )

    result = canonicalize_manifest(m)
    assert result == expected
