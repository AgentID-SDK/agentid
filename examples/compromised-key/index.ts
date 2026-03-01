import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  createRevocation,
  createRotation,
  verifyRotation,
} from '@agentid-protocol/core';

async function main() {
  // Normal operation
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
  console.log(`Agent ID: ${agentId}`);
  console.log(`Verified: ${result1.valid}\n`);

  // Revoke the compromised key
  console.log('KEY COMPROMISE DETECTED -- revoking');
  const revocation = await createRevocation(agentId, agentId, 'key_compromise', originalKp);
  console.log(`Revocation created at ${revocation.revoked_at}\n`);

  // Verifiers now reject the old key
  const revokedKeys = new Set([agentId]);
  const result2 = await verifySignedManifest(signed, { revokedKeyIds: revokedKeys });
  console.log(`Post-revocation verification: valid=${result2.valid}, revoked=${result2.revoked}`);
  console.log(`Errors: ${result2.errors.join(', ')}\n`);

  // Rotate to new key with continuity proof
  const newKp = await generateKeypair();
  const newAgentId = getAgentId(newKp.publicKey);
  const rotation = await createRotation(originalKp, newKp.publicKey);
  const { valid: rotationValid } = await verifyRotation(rotation);
  console.log(`Rotated: ${rotation.old_key_id} -> ${rotation.new_key_id}`);
  console.log(`Rotation proof valid: ${rotationValid}\n`);

  // New identity is operational
  const newManifest = createManifest({
    agentId: newAgentId,
    name: 'TrustedAgent',
    version: '2.0.0',
    capabilities: [{ id: 'data:read', description: 'Read data' }],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const newSigned = await signManifest(newManifest, newKp);
  const result3 = await verifySignedManifest(newSigned, { revokedKeyIds: revokedKeys });
  console.log(`New identity verified: ${result3.valid}`);
}

main().catch(console.error);
