/** Ed25519 keypair for agent identity. */
export interface Keypair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** Trust levels in ascending order of verification strength. */
export type TrustLevel = 0 | 1 | 2;

/** Operational constraint on a capability. */
export interface Constraint {
  /** Maximum monetary value in USD for a single action. */
  max_amount_usd?: number;
  /** Threshold above which human approval is required. */
  require_human_approval_above_usd?: number;
  /** Allowed recipient classes (e.g., "verified", "allowlist"). */
  allowed_recipients?: string[];
  /** Rate limit expression (e.g., "10/hour", "100/day"). */
  rate_limit?: string;
  /** Data scope restriction (e.g., "own_account", "organization"). */
  scope?: string;
  /** Additional constraint key-value pairs for extensibility. */
  [key: string]: unknown;
}

/** A declared capability with optional constraints. */
export interface Capability {
  /** Unique capability identifier (e.g., "payments:send", "data:read"). */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Operational constraints on this capability. */
  constraints?: Constraint;
}

/** Operator information and verification method. */
export interface Operator {
  /** Domain controlled by the operator. */
  domain?: string;
  /** Contact email. */
  contact?: string;
  /** Verification method for domain proof ("dns-txt" | "well-known"). */
  domain_proof?: 'dns-txt' | 'well-known';
}

/** The agent manifest -- an agent's identity document. */
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

/** A signed manifest envelope. */
export interface SignedManifest {
  payload: string;
  signature: string;
  key_id: string;
  signed_at: string;
}

/** A signed message for handshakes and runtime requests. */
export interface SignedMessage {
  payload: string;
  nonce: string;
  agent_id: string;
  manifest_ref: string;
  signature: string;
  signed_at: string;
}

/** A signed statement revoking a specific key. */
export interface RevocationStatement {
  type: 'revocation';
  agent_id: string;
  revoked_key_id: string;
  revoked_at: string;
  reason: string;
  signature: string;
}

/** A signed statement rotating from one key to another. */
export interface RotationStatement {
  type: 'rotation';
  old_key_id: string;
  new_key_id: string;
  rotated_at: string;
  continuity_proof: string;
  signature_by_old_key: string;
}

/** Policy decision outcome. */
export type PolicyDecision = 'ACCEPT' | 'REJECT' | 'DOWNGRADE';

/** A single rule within a policy. */
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

/** A complete policy document. */
export interface Policy {
  policy_version: string;
  rules: PolicyRule[];
  default: PolicyDecision;
}

/** Result of a policy evaluation. */
export interface PolicyResult {
  decision: PolicyDecision;
  reasons: string[];
  matched_rule?: string;
}

/** Result of verifying a signed manifest. */
export interface VerificationResult {
  valid: boolean;
  trust_level: TrustLevel;
  agent_id: string;
  expired: boolean;
  revoked: boolean;
  errors: string[];
  manifest?: AgentManifest;
}
