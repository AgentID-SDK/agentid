/**
 * Compromised Key Example
 *
 * Simulates a key compromise scenario:
 * 1. Agent operates normally with a valid identity
 * 2. Key is compromised -- operator detects it
 * 3. Operator revokes the key
 * 4. All verifiers immediately reject the compromised key
 * 5. Operator rotates to a new key with continuity proof
 */

import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  createRevocation,
  createRotation,
  verifyRotation,
} from '@agentid-sdk/core';

async function main() {
  console.log('=== AgentID Compromised Key Example ===\n');

  // Step 1: Normal operation
  console.log('1. Agent operating normally');
  const originalKp = await generateKeypair();
  const agentId = getAgentId(originalKp.publicKey);
  const manifest = createManifest({
    agentId,
    name: 'TrustedAgent',
    version: '2.0.0',
    capabilities: [{ id: 'data:read', description: 'Read data' }],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const signed = await signManifest(manifest, originalKp);
  const result1 = await verifySignedManifest(signed);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   Verified: ${result1.valid}\n`);

  // Step 2: Key compromise detected
  console.log('2. KEY COMPROMISE DETECTED');
  console.log('   Operator notices unauthorized activity\n');

  // Step 3: Revoke the compromised key
  console.log('3. Revoking compromised key');
  const revocation = await createRevocation(agentId, agentId, 'key_compromise', originalKp);
  console.log(`   Revocation statement created at ${revocation.revoked_at}`);
  console.log(`   Reason: ${revocation.reason}\n`);

  // Step 4: Verifiers now reject the old key
  console.log('4. Verifier checks with revocation list');
  const revokedKeys = new Set([agentId]);
  const result2 = await verifySignedManifest(signed, { revokedKeyIds: revokedKeys });
  console.log(`   Verified: ${result2.valid}`);
  console.log(`   Revoked:  ${result2.revoked}`);
  console.log(`   Errors:   ${result2.errors.join(', ')}\n`);

  // Step 5: Rotate to new key
  console.log('5. Rotating to new key');
  const newKp = await generateKeypair();
  const newAgentId = getAgentId(newKp.publicKey);
  const rotation = await createRotation(originalKp, newKp.publicKey);
  const { valid: rotationValid } = await verifyRotation(rotation);
  console.log(`   Old key: ${rotation.old_key_id}`);
  console.log(`   New key: ${rotation.new_key_id}`);
  console.log(`   Rotation proof valid: ${rotationValid}\n`);

  // Step 6: New key works
  console.log('6. New identity is operational');
  const newManifest = createManifest({
    agentId: newAgentId,
    name: 'TrustedAgent',
    version: '2.0.0',
    capabilities: [{ id: 'data:read', description: 'Read data' }],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const newSigned = await signManifest(newManifest, newKp);
  const result3 = await verifySignedManifest(newSigned, { revokedKeyIds: revokedKeys });
  console.log(`   New agent verified: ${result3.valid}`);
  console.log(`   Errors: ${result3.errors.length === 0 ? 'none' : result3.errors.join(', ')}\n`);

  console.log('=== Compromise contained. Old key rejected. New key operational. ===');
}

main().catch(console.error);
