import { readFile } from 'node:fs/promises';
import type {
  Policy,
  PolicyResult,
  PolicyDecision,
  AgentManifest,
  TrustLevel,
} from './types.js';

export interface PolicyContext {
  manifest: AgentManifest;
  trustLevel: TrustLevel;
  action: string;
  actionParams?: Record<string, unknown>;
  revoked: boolean;
  expired: boolean;
}

/** Evaluate a request against a policy. Returns a decision with reasons. */
export function evaluatePolicy(context: PolicyContext, policy: Policy): PolicyResult {
  const matchingRules = policy.rules.filter((rule) => rule.action === context.action);

  if (matchingRules.length === 0) {
    return {
      decision: policy.default,
      reasons: [`No policy rule matches action "${context.action}"; applying default: ${policy.default}`],
    };
  }

  for (const rule of matchingRules) {
    const failures: string[] = [];

    if (rule.require.manifest_not_expired && context.expired) {
      failures.push('Manifest is expired');
    }

    if (rule.require.not_revoked && context.revoked) {
      failures.push('Agent key has been revoked');
    }

    if (
      rule.require.min_trust_level !== undefined &&
      context.trustLevel < rule.require.min_trust_level
    ) {
      failures.push(
        `Trust level ${context.trustLevel} is below required ${rule.require.min_trust_level}`
      );
    }

    if (rule.require.capability_declared) {
      const hasCap = context.manifest.capabilities.some(
        (c) => c.id === rule.require.capability_declared
      );
      if (!hasCap) {
        failures.push(
          `Required capability "${rule.require.capability_declared}" not declared in manifest`
        );
      }
    }

    if (rule.require.constraints_satisfied && context.actionParams) {
      const constraintFailures = checkConstraints(context);
      failures.push(...constraintFailures);
    }

    if (failures.length > 0) {
      const reasons = failures.map((f) => {
        if (rule.reason_template) {
          return rule.reason_template
            .replace('{{agent_id}}', context.manifest.agent_id)
            .replace('{{failed_check}}', f);
        }
        return f;
      });

      return {
        decision: rule.on_fail,
        reasons,
        matched_rule: rule.action,
      };
    }
  }

  return {
    decision: 'ACCEPT' as PolicyDecision,
    reasons: ['All policy checks passed'],
    matched_rule: matchingRules[0].action,
  };
}

/** Load a policy from a local file path or URL. */
export async function loadPolicy(source: string): Promise<Policy> {
  let raw: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch policy from ${source}: ${response.status}`);
    }
    raw = await response.text();
  } else {
    raw = await readFile(source, 'utf-8');
  }

  return JSON.parse(raw) as Policy;
}

function checkConstraints(context: PolicyContext): string[] {
  const failures: string[] = [];
  const params = context.actionParams ?? {};

  const capability = context.manifest.capabilities.find((c) => c.id === context.action);
  if (!capability?.constraints) return failures;

  const constraints = capability.constraints;

  if (
    constraints.max_amount_usd !== undefined &&
    typeof params.amount_usd === 'number' &&
    params.amount_usd > constraints.max_amount_usd
  ) {
    failures.push(
      `Amount $${params.amount_usd} exceeds maximum allowed $${constraints.max_amount_usd}`
    );
  }

  if (
    constraints.require_human_approval_above_usd !== undefined &&
    typeof params.amount_usd === 'number' &&
    params.amount_usd > constraints.require_human_approval_above_usd
  ) {
    failures.push(
      `Amount $${params.amount_usd} exceeds human approval threshold $${constraints.require_human_approval_above_usd}`
    );
  }

  return failures;
}
