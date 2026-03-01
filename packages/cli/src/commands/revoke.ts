import { Command } from 'commander';
import { createRevocation, loadKeypair, getAgentId } from '@agentid-sdk/core';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const revokeCommand = new Command('revoke')
  .description('Create a signed revocation statement for a key')
  .option('-k, --key-dir <path>', 'Key directory', join(homedir(), '.agentid'))
  .option('--key-id <id>', 'Key ID to revoke (defaults to current key)')
  .option('--reason <reason>', 'Reason for revocation', 'key_compromise')
  .option('-o, --output <path>', 'Output file path', 'revocation.json')
  .action(async (options) => {
    const keypair = await loadKeypair(join(options.keyDir, 'keypair.json'));
    const agentId = getAgentId(keypair.publicKey);
    const revokedKeyId = options.keyId ?? agentId;

    const revocation = await createRevocation(
      agentId,
      revokedKeyId,
      options.reason,
      keypair
    );

    await writeFile(options.output, JSON.stringify(revocation, null, 2));

    console.log('Revocation statement created.\n');
    console.log(`  Agent ID:     ${agentId}`);
    console.log(`  Revoked key:  ${revokedKeyId}`);
    console.log(`  Reason:       ${options.reason}`);
    console.log(`  Output:       ${options.output}`);
    console.log(`\nPublish this statement to your revocation list endpoint.`);
  });
