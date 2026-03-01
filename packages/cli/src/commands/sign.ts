import { Command } from 'commander';
import { signManifest, loadKeypair } from '@agentid-sdk/core';
import type { AgentManifest } from '@agentid-sdk/core';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const signCommand = new Command('sign')
  .description('Sign a manifest file')
  .argument('[file]', 'Path to manifest file', 'manifest.json')
  .option('-k, --key-dir <path>', 'Key directory', join(homedir(), '.agentid'))
  .option('-o, --output <path>', 'Output file path', 'signed-manifest.json')
  .action(async (file, options) => {
    const keypair = await loadKeypair(join(options.keyDir, 'keypair.json'));
    const raw = await readFile(file, 'utf-8');
    const manifest: AgentManifest = JSON.parse(raw);

    const signed = await signManifest(manifest, keypair);
    await writeFile(options.output, JSON.stringify(signed, null, 2));

    console.log(`Signed manifest written to: ${options.output}`);
    console.log(`  Key ID:    ${signed.key_id}`);
    console.log(`  Signed at: ${signed.signed_at}`);
  });
