import json
from pathlib import Path

import pytest

from agentid.identity import generate_keypair, get_agent_id
from agentid.manifest import create_manifest
from agentid.policy import evaluate_policy
from agentid.types import (
    AgentManifest,
    Capability,
    Constraint,
    Policy,
    PolicyDecision,
    PolicyRule,
    TrustLevel,
)

VECTORS_PATH = Path(__file__).parent.parent.parent.parent / "spec" / "test-vectors" / "vectors.json"


def _make_manifest():
    kp = generate_keypair()
    return create_manifest(
        agent_id=get_agent_id(kp.public_key),
        name="TestAgent",
        version="1.0.0",
        capabilities=[
            Capability(
                id="payments:send",
                description="Send payments",
                constraints=Constraint(
                    max_amount_usd=500,
                    require_human_approval_above_usd=100,
                ),
            ),
        ],
        expires_at="2030-01-01T00:00:00Z",
    )


POLICY = Policy(
    policy_version="0.1",
    rules=[
        PolicyRule(
            action="payments:send",
            require={
                "min_trust_level": 0,
                "manifest_not_expired": True,
                "not_revoked": True,
                "capability_declared": "payments:send",
                "constraints_satisfied": True,
            },
            on_fail="REJECT",
        )
    ],
    default="REJECT",
)


def test_accept_valid_request():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        action_params={"amount_usd": 50},
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.ACCEPT


def test_reject_amount_exceeds_max():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        action_params={"amount_usd": 300_000},
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.REJECT
    assert any("exceeds maximum" in r for r in result.reasons)


def test_reject_amount_exceeds_human_approval():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        action_params={"amount_usd": 200},
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.REJECT
    assert any("human approval" in r for r in result.reasons)


def test_reject_expired():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        expired=True,
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.REJECT


def test_reject_revoked():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        revoked=True,
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.REJECT


def test_reject_unknown_action():
    m = _make_manifest()
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="unknown:action",
        policy=POLICY,
    )
    assert result.decision == PolicyDecision.REJECT


def test_reject_insufficient_trust():
    m = _make_manifest()
    strict_policy = Policy(
        policy_version="0.1",
        rules=[
            PolicyRule(
                action="payments:send",
                require={"min_trust_level": 1},
                on_fail="REJECT",
            )
        ],
        default="REJECT",
    )
    result = evaluate_policy(
        manifest=m,
        trust_level=TrustLevel.SELF_SIGNED,
        action="payments:send",
        policy=strict_policy,
    )
    assert result.decision == PolicyDecision.REJECT


def test_vector_consistency():
    if not VECTORS_PATH.exists():
        pytest.skip("Test vectors not found")
    vectors = json.loads(VECTORS_PATH.read_text())
    manifest_input = vectors["manifest"]["input"]

    caps = []
    for c in manifest_input["capabilities"]:
        constraint = None
        if "constraints" in c:
            constraint = Constraint(max_amount_usd=c["constraints"].get("max_amount_usd"))
        caps.append(Capability(id=c["id"], description=c["description"], constraints=constraint))

    manifest = AgentManifest(
        manifest_version=manifest_input["manifest_version"],
        agent_id=manifest_input["agent_id"],
        name=manifest_input["name"],
        version=manifest_input["version"],
        capabilities=caps,
        expires_at=manifest_input["expires_at"],
    )

    vector_policy_data = vectors["policy_evaluation"]["policy"]
    vector_policy = Policy(
        policy_version=vector_policy_data["policy_version"],
        rules=[
            PolicyRule(
                action=r["action"],
                require=r["require"],
                on_fail=r["on_fail"],
                reason_template=r.get("reason_template"),
            )
            for r in vector_policy_data["rules"]
        ],
        default=vector_policy_data["default"],
    )

    for tc in vectors["policy_evaluation"]["cases"]:
        result = evaluate_policy(
            manifest=manifest,
            trust_level=TrustLevel(tc["trust_level"]),
            action=tc["action"],
            action_params=tc["action_params"],
            revoked=tc["revoked"],
            expired=tc["expired"],
            policy=vector_policy,
        )
        assert result.decision.value == tc["expected_decision"], f"Case '{tc['name']}' failed"
