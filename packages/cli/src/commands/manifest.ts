import { Command } from 'commander';
import { createManifest, validateManifest, loadKeypair, getAgentId } from '@agentid-protocol/core';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const manifestCommand = new Command('manifest')
  .description('Create and validate agent manifests');

manifestCommand
  .command('create')
  .description('Create a new agent manifest')
  .requiredOption('-n, --name <name>', 'Agent name')
  .requiredOption('-v, --agent-version <version>', 'Agent version')
  .option('-c, --capabilities <caps...>', 'Capability IDs (e.g., "payments:send" "data:read")')
  .option('-e, --expires <date>', 'Expiry date (ISO 8601)', defaultExpiry())
  .option('-o, --output <path>', 'Output file path', 'manifest.json')
  .option('-k, --key-dir <path>', 'Key directory', join(homedir(), '.agentid'))
  .action(async (options) => {
    const keypair = await loadKeypair(join(options.keyDir, 'keypair.json'));
    const agentId = getAgentId(keypair.publicKey);

    const capabilities = (options.capabilities ?? []).map((id: string) => ({
      id,
      description: id,
      constraints: {},
    }));

    const manifest = createManifest({
      agentId,
      name: options.name,
      version: options.agentVersion,
      capabilities,
      expiresAt: options.expires,
    });

    await writeFile(options.output, JSON.stringify(manifest, null, 2));
    console.log(`Manifest created: ${options.output}`);
  });

manifestCommand
  .command('validate')
  .description('Validate an existing manifest file')
  .argument('<file>', 'Path to manifest file')
  .action(async (file) => {
    const raw = await readFile(file, 'utf-8');
    const manifest = JSON.parse(raw);
    const errors = validateManifest(manifest);

    if (errors.length === 0) {
      console.log('Manifest is valid.');
    } else {
      console.error('Manifest validation failed:');
      errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
  });

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}
