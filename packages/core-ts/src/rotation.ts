import * as ed25519 from '@noble/ed25519';
import type { Keypair, RotationStatement } from './types.js';
import { getAgentId } from './identity.js';
import { encodeBase64, decodeBase64, decodeBase58 } from './utils.js';

/**
 * Create a signed rotation statement proving key continuity.
 * The old key signs a statement delegating trust to the new key.
 */
export async function createRotation(
  oldKeypair: Keypair,
  newPublicKey: Uint8Array
): Promise<RotationStatement> {
  const oldKeyId = getAgentId(oldKeypair.publicKey);
  const newKeyId = getAgentId(newPublicKey);
  const rotatedAt = new Date().toISOString();

  const continuityProof = `rotate:${oldKeyId}:${newKeyId}:${rotatedAt}`;
  const proofBytes = new TextEncoder().encode(continuityProof);
  const signatureBytes = await ed25519.signAsync(proofBytes, oldKeypair.privateKey);

  return {
    type: 'rotation',
    old_key_id: oldKeyId,
    new_key_id: newKeyId,
    rotated_at: rotatedAt,
    continuity_proof: continuityProof,
    signature_by_old_key: encodeBase64(signatureBytes),
  };
}

/**
 * Verify a rotation statement: check that the old key actually signed the
 * continuity proof delegating to the new key.
 */
export async function verifyRotation(
  statement: RotationStatement
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const expectedProof = `rotate:${statement.old_key_id}:${statement.new_key_id}:${statement.rotated_at}`;
  if (statement.continuity_proof !== expectedProof) {
    errors.push('Continuity proof content does not match statement fields');
  }

  const oldPublicKey = extractPublicKey(statement.old_key_id);
  if (!oldPublicKey) {
    return { valid: false, errors: ['Cannot extract public key from old_key_id'] };
  }

  const proofBytes = new TextEncoder().encode(statement.continuity_proof);
  const signatureBytes = decodeBase64(statement.signature_by_old_key);

  try {
    const signatureValid = await ed25519.verifyAsync(signatureBytes, proofBytes, oldPublicKey);
    if (!signatureValid) {
      errors.push('Signature by old key is invalid');
    }
  } catch {
    errors.push('Signature verification threw an error');
  }

  return { valid: errors.length === 0, errors };
}

function extractPublicKey(keyId: string): Uint8Array | null {
  const prefix = 'aid_ed25519_';
  if (!keyId.startsWith(prefix)) return null;
  try {
    return decodeBase58(keyId.slice(prefix.length));
  } catch {
    return null;
  }
}
