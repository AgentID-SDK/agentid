import type { AgentManifest } from './types.js';

const CURRENT_MANIFEST_VERSION = '0.1';

const REQUIRED_FIELDS: (keyof AgentManifest)[] = [
  'manifest_version',
  'agent_id',
  'name',
  'version',
  'capabilities',
  'expires_at',
];

export interface CreateManifestConfig {
  agentId: string;
  name: string;
  version: string;
  capabilities: AgentManifest['capabilities'];
  expiresAt: string;
  operator?: AgentManifest['operator'];
  policyUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Create a new agent manifest from a config object. */
export function createManifest(config: CreateManifestConfig): AgentManifest {
  const manifest: AgentManifest = {
    manifest_version: CURRENT_MANIFEST_VERSION,
    agent_id: config.agentId,
    name: config.name,
    version: config.version,
    capabilities: config.capabilities,
    expires_at: config.expiresAt,
  };

  if (config.operator) manifest.operator = config.operator;
  if (config.policyUrl) manifest.policy_url = config.policyUrl;
  if (config.metadata) manifest.metadata = config.metadata;

  const errors = validateManifest(manifest);
  if (errors.length > 0) {
    throw new Error(`Invalid manifest: ${errors.join('; ')}`);
  }

  return manifest;
}

/** Validate a manifest against the schema. Returns an array of error strings (empty if valid). */
export function validateManifest(manifest: AgentManifest): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.manifest_version && manifest.manifest_version !== CURRENT_MANIFEST_VERSION) {
    errors.push(
      `Unsupported manifest version: ${manifest.manifest_version} (expected ${CURRENT_MANIFEST_VERSION})`
    );
  }

  if (manifest.agent_id && !manifest.agent_id.startsWith('aid_ed25519_')) {
    errors.push('agent_id must start with "aid_ed25519_"');
  }

  if (manifest.name && manifest.name.length > 256) {
    errors.push('name must be 256 characters or less');
  }

  if (manifest.capabilities) {
    if (!Array.isArray(manifest.capabilities)) {
      errors.push('capabilities must be an array');
    } else {
      for (let i = 0; i < manifest.capabilities.length; i++) {
        const cap = manifest.capabilities[i];
        if (!cap.id) errors.push(`capabilities[${i}]: missing id`);
        if (!cap.description) errors.push(`capabilities[${i}]: missing description`);
      }
    }
  }

  if (manifest.expires_at) {
    const expiry = new Date(manifest.expires_at);
    if (isNaN(expiry.getTime())) {
      errors.push('expires_at is not a valid ISO 8601 date');
    }
  }

  return errors;
}

/**
 * Deterministic JSON serialization following RFC 8785 (JCS) conventions.
 * Produces byte-for-byte identical output for logically equivalent manifests
 * across TypeScript and Python SDKs.
 *
 * Cross-language contract:
 * - Object keys are sorted lexicographically
 * - Properties with `undefined` or `null` values are OMITTED (not serialized)
 * - Strings use JSON.stringify escaping
 * - Numbers follow ES2024 serialization rules
 * - Arrays preserve order; null/undefined elements become "null"
 */
export function canonicalizeManifest(manifest: AgentManifest): string {
  const cleaned = stripNullUndefined(manifest);
  return canonicalize(cleaned);
}

/**
 * Recursively remove all keys whose values are null or undefined,
 * ensuring consistent behavior with the Python SDK which filters None.
 */
function stripNullUndefined(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(stripNullUndefined);
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== null && v !== undefined) {
      result[k] = stripNullUndefined(v);
    }
  }
  return result;
}

function canonicalize(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return serializeNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]));
    return '{' + pairs.join(',') + '}';
  }
  throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

function serializeNumber(n: number): string {
  if (Object.is(n, -0)) return '0';
  if (!isFinite(n)) throw new Error('Cannot canonicalize non-finite number');
  return JSON.stringify(n);
}
