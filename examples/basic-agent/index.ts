import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
} from '@agentid-protocol/core';

async function main() {
  const keypair = await generateKeypair();
  const agentId = getAgentId(keypair.publicKey);
  console.log(`Generated identity: ${agentId}\n`);

  const manifest = createManifest({
    agentId,
    name: 'BasicAgent',
    version: '1.0.0',
    capabilities: [
      { id: 'data:read', description: 'Read public data sources' },
      { id: 'data:summarize', description: 'Summarize text content' },
    ],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(`Created manifest: ${manifest.name} v${manifest.version}`);
  console.log(`Capabilities: ${manifest.capabilities.map(c => c.id).join(', ')}\n`);

  const signed = await signManifest(manifest, keypair);
  console.log(`Signed manifest at ${signed.signed_at}\n`);

  const result = await verifySignedManifest(signed);
  console.log('Verification result:');
  console.log(`  Valid:       ${result.valid}`);
  console.log(`  Trust Level: ${result.trust_level} (self-signed)`);
  console.log(`  Agent ID:    ${result.agent_id}`);
  console.log(`  Expired:     ${result.expired}`);
  console.log(`  Revoked:     ${result.revoked}`);
}

main().catch(console.error);
