import * as ed25519 from '@noble/ed25519';
import type {
  SignedManifest,
  SignedMessage,
  AgentManifest,
  VerificationResult,
  TrustLevel,
  RevocationStatement,
} from './types.js';
import { decodeBase64, decodeBase64AsString, decodeBase58 } from './utils.js';

export interface VerifyOptions {
  revokedKeyIds?: Set<string>;
  /** Override current time (useful for testing). */
  now?: Date;
  /** Defaults to false (offline verification only). */
  verifyDomainProof?: boolean;
  domainProofVerifier?: (domain: string, method: 'dns-txt' | 'well-known') => Promise<boolean>;
}

export async function verifySignedManifest(
  signedManifest: SignedManifest,
  options: VerifyOptions = {}
): Promise<VerificationResult> {
  const errors: string[] = [];
  const now = options.now ?? new Date();

  const publicKeyBytes = extractPublicKey(signedManifest.key_id);
  if (!publicKeyBytes) {
    return {
      valid: false,
      trust_level: 0,
      agent_id: signedManifest.key_id,
      expired: false,
      revoked: false,
      errors: ['Invalid key_id format: cannot extract public key'],
    };
  }

  const payloadBytes = new TextEncoder().encode(signedManifest.payload);
  const signatureBytes = decodeBase64(signedManifest.signature);

  let signatureValid: boolean;
  try {
    signatureValid = await ed25519.verifyAsync(signatureBytes, payloadBytes, publicKeyBytes);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    errors.push('Signature verification failed');
  }

  let manifest: AgentManifest | undefined;
  try {
    manifest = JSON.parse(signedManifest.payload) as AgentManifest;
  } catch {
    errors.push('Failed to parse manifest payload as JSON');
  }

  if (manifest && manifest.agent_id !== signedManifest.key_id) {
    errors.push(
      `Manifest agent_id (${manifest.agent_id}) does not match signing key_id (${signedManifest.key_id})`
    );
  }

  const expired = manifest?.expires_at ? new Date(manifest.expires_at) < now : false;
  if (expired) {
    errors.push(`Manifest expired at ${manifest!.expires_at}`);
  }

  const revoked = options.revokedKeyIds?.has(signedManifest.key_id) ?? false;
  if (revoked) {
    errors.push('Key has been revoked');
  }

  let trustLevel: TrustLevel = 0;
  if (
    manifest?.operator?.domain &&
    manifest?.operator?.domain_proof &&
    options.verifyDomainProof &&
    options.domainProofVerifier
  ) {
    try {
      const domainVerified = await options.domainProofVerifier(
        manifest.operator.domain,
        manifest.operator.domain_proof
      );
      if (domainVerified) {
        trustLevel = 1;
      }
    } catch {
      errors.push('Domain proof verification failed');
    }
  }

  return {
    valid: signatureValid && !expired && !revoked && errors.length === 0,
    trust_level: trustLevel,
    agent_id: signedManifest.key_id,
    expired,
    revoked,
    errors,
    manifest,
  };
}

export async function verifySignedMessage(
  signedMessage: SignedMessage,
  expectedAgentId?: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (expectedAgentId && signedMessage.agent_id !== expectedAgentId) {
    errors.push(
      `Agent ID mismatch: expected ${expectedAgentId}, got ${signedMessage.agent_id}`
    );
  }

  const publicKeyBytes = extractPublicKey(signedMessage.agent_id);
  if (!publicKeyBytes) {
    return { valid: false, errors: ['Invalid agent_id format'] };
  }

  const payloadDecoded = decodeBase64AsString(signedMessage.payload);
  const message = `${signedMessage.nonce}:${payloadDecoded}:${signedMessage.manifest_ref}`;
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = decodeBase64(signedMessage.signature);

  let signatureValid: boolean;
  try {
    signatureValid = await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    errors.push('Signature verification failed');
  }

  return { valid: errors.length === 0, errors };
}

export async function verifyRevocationSignature(
  statement: RevocationStatement
): Promise<boolean> {
  const publicKeyBytes = extractPublicKey(statement.agent_id);
  if (!publicKeyBytes) return false;

  const payload: Record<string, string> = {
    type: statement.type,
    agent_id: statement.agent_id,
    revoked_key_id: statement.revoked_key_id,
    revoked_at: statement.revoked_at,
    reason: statement.reason,
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signatureBytes = decodeBase64(statement.signature);

  try {
    return await ed25519.verifyAsync(signatureBytes, payloadBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

function extractPublicKey(keyId: string): Uint8Array | null {
  const prefix = 'aid_ed25519_';
  if (!keyId.startsWith(prefix)) return null;
  const encoded = keyId.slice(prefix.length);
  try {
    return decodeBase58(encoded);
  } catch {
    return null;
  }
}
