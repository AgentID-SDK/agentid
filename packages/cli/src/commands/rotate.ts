import { Command } from 'commander';
import { generateKeypair, loadKeypair, saveKeypair, getAgentId, createRotation } from '@agentid-protocol/core';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const rotateCommand = new Command('rotate')
  .description('Rotate to a new keypair with signed continuity proof')
  .option('-k, --key-dir <path>', 'Key directory', join(homedir(), '.agentid'))
  .action(async (options) => {
    const oldKeypair = await loadKeypair(join(options.keyDir, 'keypair.json'));
    const newKeypair = await generateKeypair();

    const rotation = await createRotation(oldKeypair, newKeypair.publicKey);

    const backupPath = join(options.keyDir, `keypair.old.${Date.now()}.json`);
    await saveKeypair(oldKeypair, backupPath);
    await saveKeypair(newKeypair, join(options.keyDir, 'keypair.json'), { overwrite: true });

    const rotationPath = join(options.keyDir, 'rotation.json');
    await writeFile(rotationPath, JSON.stringify(rotation, null, 2));

    console.log('Key rotation complete.\n');
    console.log(`  Old key: ${rotation.old_key_id}`);
    console.log(`  New key: ${rotation.new_key_id}`);
    console.log(`  Old key backed up to: ${backupPath}`);
    console.log(`  Rotation statement (signed): ${rotationPath}`);
    console.log(`\nNext: re-sign your manifest with "agentid sign"`);
  });
