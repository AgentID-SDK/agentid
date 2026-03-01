import { randomBytes } from 'node:crypto';
import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  signMessage,
  verifySignedManifest,
  verifySignedMessage,
} from '@agentid-protocol/core';

async function main() {
  // Agent A: create identity and signed manifest
  const keypairA = await generateKeypair();
  const agentIdA = getAgentId(keypairA.publicKey);
  const manifestA = createManifest({
    agentId: agentIdA,
    name: 'AgentAlpha',
    version: '1.0.0',
    capabilities: [{ id: 'data:read', description: 'Read data' }],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const signedManifestA = await signManifest(manifestA, keypairA);
  console.log(`Agent A: ${agentIdA}`);

  // Agent B: verifier
  const keypairB = await generateKeypair();
  console.log(`Agent B: ${getAgentId(keypairB.publicKey)}\n`);

  // Agent A sends signed manifest; Agent B verifies it
  const verifyResult = await verifySignedManifest(signedManifestA);
  console.log(`Manifest valid: ${verifyResult.valid}`);

  // Agent B sends nonce challenge
  const nonce = randomBytes(32).toString('hex');
  console.log(`Nonce: ${nonce.slice(0, 16)}...`);

  // Agent A signs the nonce
  const manifestHash = 'sha256:' + randomBytes(16).toString('hex');
  const signedResponse = await signMessage('handshake-accept', nonce, keypairA, manifestHash);

  // Agent B verifies the nonce signature
  const messageResult = await verifySignedMessage(signedResponse, agentIdA);
  console.log(`Handshake valid: ${messageResult.valid}\n`);

  // Demonstrate replay rejection
  const replayNonce = randomBytes(32).toString('hex');
  const replayAttempt = { ...signedResponse, nonce: replayNonce };
  const replayResult = await verifySignedMessage(replayAttempt, agentIdA);
  console.log(`Replay attempt valid: ${replayResult.valid}`);
  console.log(`Replay errors: ${replayResult.errors.join(', ')}`);
}

main().catch(console.error);
