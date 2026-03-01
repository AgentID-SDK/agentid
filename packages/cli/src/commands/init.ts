import { Command } from 'commander';
import { generateKeypair, saveKeypair, getAgentId } from '@agentid-sdk/core';
import { mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const initCommand = new Command('init')
  .description('Generate a new agent keypair and initialize AgentID')
  .option('-d, --dir <path>', 'Directory to store keys', join(homedir(), '.agentid'))
  .option('-f, --force', 'Overwrite existing keypair if present', false)
  .action(async (options) => {
    const dir = options.dir;
    const keyPath = join(dir, 'keypair.json');

    await mkdir(dir, { recursive: true });

    if (!options.force) {
      try {
        await access(keyPath);
        console.error(`Error: Key file already exists at ${keyPath}`);
        console.error('Use --force to overwrite, or back up the existing key first.');
        process.exit(1);
      } catch {
        // File does not exist, proceed
      }
    }

    const keypair = await generateKeypair();
    await saveKeypair(keypair, keyPath, { overwrite: options.force });

    const agentId = getAgentId(keypair.publicKey);

    console.log('AgentID initialized successfully.\n');
    console.log(`  Agent ID:  ${agentId}`);
    console.log(`  Keys:      ${keyPath}`);
    console.log(`\nNext: run "agentid manifest create" to create your agent manifest.`);
  });
