import { Command } from 'commander';
import { evaluatePolicy, loadPolicy, verifySignedManifest } from '@agentid-sdk/core';
import type { SignedManifest, TrustLevel } from '@agentid-sdk/core';
import { readFile } from 'node:fs/promises';

export const policyCommand = new Command('policy')
  .description('Test policy evaluation against a manifest');

policyCommand
  .command('test')
  .description('Evaluate a policy against a signed manifest and action')
  .requiredOption('-m, --manifest <file>', 'Path to signed manifest')
  .requiredOption('-a, --action <action>', 'Action to evaluate (e.g., "payments:send")')
  .requiredOption('-p, --policy <file>', 'Path to policy file')
  .option('--amount <usd>', 'Amount in USD for constraint checking', parseFloat)
  .action(async (options) => {
    const signedRaw = await readFile(options.manifest, 'utf-8');
    const signed: SignedManifest = JSON.parse(signedRaw);

    const verifyResult = await verifySignedManifest(signed);
    const policy = await loadPolicy(options.policy);

    const actionParams: Record<string, unknown> = {};
    if (options.amount !== undefined) {
      actionParams.amount_usd = options.amount;
    }

    const result = evaluatePolicy(
      {
        manifest: verifyResult.manifest!,
        trustLevel: verifyResult.trust_level as TrustLevel,
        action: options.action,
        actionParams,
        revoked: verifyResult.revoked,
        expired: verifyResult.expired,
      },
      policy
    );

    console.log(`Decision: ${result.decision}`);
    console.log('Reasons:');
    result.reasons.forEach((r) => console.log(`  - ${r}`));
    if (result.matched_rule) {
      console.log(`Matched rule: ${result.matched_rule}`);
    }

    if (result.decision === 'REJECT') {
      process.exit(1);
    }
  });
