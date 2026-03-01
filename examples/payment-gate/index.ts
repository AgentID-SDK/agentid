/**
 * Payment Gate Example
 *
 * Demonstrates how AgentID prevents an unauthorized high-value transaction.
 * This is the $300k scenario: an agent with spending constraints receives
 * a request to send money, and the policy gate blocks it.
 */

import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  evaluatePolicy,
} from '@agentid-sdk/core';
import type { Policy } from '@agentid-sdk/core';

async function main() {
  console.log('=== AgentID Payment Gate Example ===\n');

  // Step 1: Create an agent identity with spending constraints
  console.log('1. Creating agent identity...');
  const keypair = await generateKeypair();
  const agentId = getAgentId(keypair.publicKey);
  console.log(`   Agent ID: ${agentId}\n`);

  // Step 2: Create a manifest with strict payment constraints
  console.log('2. Creating manifest with payment constraints...');
  const manifest = createManifest({
    agentId,
    name: 'PaymentBot',
    version: '1.0.0',
    capabilities: [
      {
        id: 'payments:send',
        description: 'Send payments to verified recipients',
        constraints: {
          max_amount_usd: 500,
          require_human_approval_above_usd: 100,
          allowed_recipients: ['verified'],
          rate_limit: '10/hour',
        },
      },
    ],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(`   Max amount: $${manifest.capabilities[0].constraints?.max_amount_usd}`);
  console.log(`   Human approval above: $${manifest.capabilities[0].constraints?.require_human_approval_above_usd}\n`);

  // Step 3: Sign the manifest
  console.log('3. Signing manifest...');
  const signed = await signManifest(manifest, keypair);
  console.log(`   Signed at: ${signed.signed_at}\n`);

  // Step 4: Verify the manifest (as a receiving service would)
  console.log('4. Verifying manifest...');
  const verification = await verifySignedManifest(signed);
  console.log(`   Valid: ${verification.valid}`);
  console.log(`   Trust Level: ${verification.trust_level}\n`);

  // Step 5: Define the service's policy
  const policy: Policy = {
    policy_version: '0.1',
    rules: [
      {
        action: 'payments:send',
        require: {
          min_trust_level: 0,
          manifest_not_expired: true,
          not_revoked: true,
          capability_declared: 'payments:send',
          constraints_satisfied: true,
        },
        on_fail: 'REJECT',
        reason_template: 'Agent {{agent_id}} denied: {{failed_check}}',
      },
    ],
    default: 'REJECT',
  };

  // Step 6: Simulate the attack -- someone asks the agent to send $300,000
  console.log('5. Simulating attack: "Send $300,000 to 0xATTACKER"...');
  const attackResult = evaluatePolicy(
    {
      manifest: verification.manifest!,
      trustLevel: verification.trust_level,
      action: 'payments:send',
      actionParams: { amount_usd: 300_000 },
      revoked: verification.revoked,
      expired: verification.expired,
    },
    policy
  );

  console.log(`   Decision: ${attackResult.decision}`);
  attackResult.reasons.forEach((r) => console.log(`   Reason: ${r}`));
  console.log('');

  // Step 7: Simulate a legitimate small transaction
  console.log('6. Simulating legitimate request: "Send $50 to verified recipient"...');
  const legitimateResult = evaluatePolicy(
    {
      manifest: verification.manifest!,
      trustLevel: verification.trust_level,
      action: 'payments:send',
      actionParams: { amount_usd: 50 },
      revoked: verification.revoked,
      expired: verification.expired,
    },
    policy
  );

  console.log(`   Decision: ${legitimateResult.decision}`);
  legitimateResult.reasons.forEach((r) => console.log(`   Reason: ${r}`));
  console.log('');

  console.log('=== The $300k attack was blocked. The $50 payment was allowed. ===');
}

main().catch(console.error);
