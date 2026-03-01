export interface Keypair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export type TrustLevel = 0 | 1 | 2;

export interface Constraint {
  max_amount_usd?: number;
  require_human_approval_above_usd?: number;
  allowed_recipients?: string[];
  rate_limit?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface Capability {
  id: string;
  description: string;
  constraints?: Constraint;
}

export interface Operator {
  domain?: string;
  contact?: string;
  domain_proof?: 'dns-txt' | 'well-known';
}

export interface AgentManifest {
  manifest_version: string;
  agent_id: string;
  name: string;
  version: string;
  operator?: Operator;
  capabilities: Capability[];
  expires_at: string;
  policy_url?: string;
  metadata?: Record<string, unknown>;
}

export interface SignedManifest {
  payload: string;
  signature: string;
  key_id: string;
  signed_at: string;
}

export interface SignedMessage {
  payload: string;
  nonce: string;
  agent_id: string;
  manifest_ref: string;
  signature: string;
  signed_at: string;
}

export interface RevocationStatement {
  type: 'revocation';
  agent_id: string;
  revoked_key_id: string;
  revoked_at: string;
  reason: string;
  signature: string;
}

export interface RotationStatement {
  type: 'rotation';
  old_key_id: string;
  new_key_id: string;
  rotated_at: string;
  continuity_proof: string;
  signature_by_old_key: string;
}

export type PolicyDecision = 'ACCEPT' | 'REJECT' | 'DOWNGRADE';

export interface PolicyRule {
  action: string;
  require: {
    min_trust_level?: TrustLevel;
    manifest_not_expired?: boolean;
    not_revoked?: boolean;
    capability_declared?: string;
    constraints_satisfied?: boolean;
  };
  on_fail: PolicyDecision;
  reason_template?: string;
}

export interface Policy {
  policy_version: string;
  rules: PolicyRule[];
  default: PolicyDecision;
}

export interface PolicyResult {
  decision: PolicyDecision;
  reasons: string[];
  matched_rule?: string;
}

export interface VerificationResult {
  valid: boolean;
  trust_level: TrustLevel;
  agent_id: string;
  expired: boolean;
  revoked: boolean;
  errors: string[];
  manifest?: AgentManifest;
}
