import { Command } from 'commander';
import { verifySignedManifest } from '@agentid-protocol/core';
import type { SignedManifest } from '@agentid-protocol/core';
import { readFile } from 'node:fs/promises';

export const verifyCommand = new Command('verify')
  .description('Verify a signed manifest')
  .argument('<file>', 'Path to signed manifest file or URL')
  .action(async (file) => {
    let raw: string;

    if (file.startsWith('http://') || file.startsWith('https://')) {
      const response = await fetch(file);
      if (!response.ok) {
        console.error(`Failed to fetch: ${response.status}`);
        process.exit(1);
      }
      raw = await response.text();
    } else {
      raw = await readFile(file, 'utf-8');
    }

    const signed: SignedManifest = JSON.parse(raw);
    const result = await verifySignedManifest(signed);

    if (result.valid) {
      console.log('VERIFIED');
      console.log(`  Agent ID:    ${result.agent_id}`);
      console.log(`  Trust Level: ${result.trust_level} (${trustLevelLabel(result.trust_level)})`);
      if (result.manifest) {
        console.log(`  Name:        ${result.manifest.name} v${result.manifest.version}`);
        console.log(`  Expires:     ${result.manifest.expires_at}`);
        console.log(`  Capabilities: ${result.manifest.capabilities.map((c) => c.id).join(', ')}`);
      }
    } else {
      console.error('VERIFICATION FAILED');
      result.errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
  });

function trustLevelLabel(level: number): string {
  switch (level) {
    case 0: return 'self-signed';
    case 1: return 'domain-verified';
    case 2: return 'organization-verified';
    default: return 'unknown';
  }
}
