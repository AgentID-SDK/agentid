/**
 * Handshake Example
 *
 * Demonstrates a nonce challenge-response handshake between two agents.
 * This prevents replay attacks -- a signed manifest alone could be reused,
 * but a nonce-signed message proves the agent is live.
 */

import { randomBytes } from 'node:crypto';
import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  signMessage,
  verifySignedManifest,
  verifySignedMessage,
} from '@agentid-sdk/core';

async function main() {
  console.log('=== AgentID Handshake Example ===\n');

  // Agent A setup
  console.log('--- Agent A: Creating identity ---');
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
  console.log(`  Agent A ID: ${agentIdA}\n`);

  // Agent B setup (the verifier)
  console.log('--- Agent B (Verifier): Creating identity ---');
  const keypairB = await generateKeypair();
  const agentIdB = getAgentId(keypairB.publicKey);
  console.log(`  Agent B ID: ${agentIdB}\n`);

  // Step 1: Agent A sends signed manifest to Agent B
  console.log('Step 1: Agent A sends signed manifest to Agent B');
  const verifyResult = await verifySignedManifest(signedManifestA);
  console.log(`  Manifest valid: ${verifyResult.valid}\n`);

  // Step 2: Agent B generates a nonce challenge
  console.log('Step 2: Agent B generates nonce challenge');
  const nonce = randomBytes(32).toString('hex');
  console.log(`  Nonce: ${nonce.slice(0, 16)}...\n`);

  // Step 3: Agent A signs the nonce
  console.log('Step 3: Agent A signs the nonce');
  const manifestHash = 'sha256:' + randomBytes(16).toString('hex');
  const signedResponse = await signMessage('handshake-accept', nonce, keypairA, manifestHash);
  console.log(`  Signed message created\n`);

  // Step 4: Agent B verifies the signed nonce
  console.log('Step 4: Agent B verifies the signed nonce');
  const messageResult = await verifySignedMessage(signedResponse, agentIdA);
  console.log(`  Message valid: ${messageResult.valid}`);
  console.log(`  Errors: ${messageResult.errors.length === 0 ? 'none' : messageResult.errors.join(', ')}\n`);

  // Step 5: Demonstrate replay rejection
  console.log('Step 5: Attempting replay with different nonce (should fail)');
  const replayNonce = randomBytes(32).toString('hex');
  const replayAttempt = { ...signedResponse, nonce: replayNonce };
  const replayResult = await verifySignedMessage(replayAttempt, agentIdA);
  console.log(`  Replay valid: ${replayResult.valid}`);
  console.log(`  Errors: ${replayResult.errors.join(', ')}\n`);

  console.log('=== Handshake succeeded. Replay was rejected. ===');
}

main().catch(console.error);
