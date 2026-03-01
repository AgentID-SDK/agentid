"""Policy evaluation engine."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from agentid.types import (
    AgentManifest,
    Policy,
    PolicyDecision,
    PolicyResult,
    PolicyRule,
    TrustLevel,
)


def evaluate_policy(
    *,
    manifest: AgentManifest,
    trust_level: TrustLevel,
    action: str,
    action_params: Optional[dict[str, Any]] = None,
    revoked: bool = False,
    expired: bool = False,
    policy: Policy,
) -> PolicyResult:
    """Evaluate a request against a policy. Returns a decision with reasons."""
    matching_rules = [r for r in policy.rules if r.action == action]

    if not matching_rules:
        return PolicyResult(
            decision=PolicyDecision(policy.default),
            reasons=[f'No policy rule matches action "{action}"; applying default: {policy.default}'],
        )

    for rule in matching_rules:
        failures: list[str] = []
        req = rule.require

        if req.get("manifest_not_expired") and expired:
            failures.append("Manifest is expired")

        if req.get("not_revoked") and revoked:
            failures.append("Agent key has been revoked")

        min_trust = req.get("min_trust_level")
        if min_trust is not None and trust_level.value < min_trust:
            failures.append(
                f"Trust level {trust_level.value} is below required {min_trust}"
            )

        cap_required = req.get("capability_declared")
        if cap_required:
            has_cap = any(c.id == cap_required for c in manifest.capabilities)
            if not has_cap:
                failures.append(
                    f'Required capability "{cap_required}" not declared in manifest'
                )

        if req.get("constraints_satisfied") and action_params:
            failures.extend(_check_constraints(manifest, action, action_params))

        if failures:
            reasons = []
            for f in failures:
                if rule.reason_template:
                    reasons.append(
                        rule.reason_template
                        .replace("{{agent_id}}", manifest.agent_id)
                        .replace("{{failed_check}}", f)
                    )
                else:
                    reasons.append(f)

            return PolicyResult(
                decision=PolicyDecision(rule.on_fail),
                reasons=reasons,
                matched_rule=rule.action,
            )

    return PolicyResult(
        decision=PolicyDecision.ACCEPT,
        reasons=["All policy checks passed"],
        matched_rule=matching_rules[0].action,
    )


def load_policy(source: str) -> Policy:
    """Load a policy from a file path."""
    raw = Path(source).read_text(encoding="utf-8")
    data = json.loads(raw)

    rules = [
        PolicyRule(
            action=r["action"],
            require=r["require"],
            on_fail=r["on_fail"],
            reason_template=r.get("reason_template"),
        )
        for r in data["rules"]
    ]

    return Policy(
        policy_version=data["policy_version"],
        rules=rules,
        default=data["default"],
    )


def _check_constraints(
    manifest: AgentManifest, action: str, params: dict[str, Any]
) -> list[str]:
    failures: list[str] = []

    capability = next((c for c in manifest.capabilities if c.id == action), None)
    if not capability or not capability.constraints:
        return failures

    constraints = capability.constraints

    if (
        constraints.max_amount_usd is not None
        and isinstance(params.get("amount_usd"), (int, float))
        and params["amount_usd"] > constraints.max_amount_usd
    ):
        failures.append(
            f"Amount ${params['amount_usd']} exceeds maximum allowed ${constraints.max_amount_usd}"
        )

    if (
        constraints.require_human_approval_above_usd is not None
        and isinstance(params.get("amount_usd"), (int, float))
        and params["amount_usd"] > constraints.require_human_approval_above_usd
    ):
        failures.append(
            f"Amount ${params['amount_usd']} exceeds human approval threshold "
            f"${constraints.require_human_approval_above_usd}"
        )

    return failures
