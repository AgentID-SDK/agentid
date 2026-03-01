#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { manifestCommand } from './commands/manifest.js';
import { signCommand } from './commands/sign.js';
import { verifyCommand } from './commands/verify.js';
import { policyCommand } from './commands/policy.js';
import { rotateCommand } from './commands/rotate.js';
import { revokeCommand } from './commands/revoke.js';

program
  .name('agentid')
  .description('Manage AI agent identities, manifests, and trust verification')
  .version('0.1.2');

program.addCommand(initCommand);
program.addCommand(manifestCommand);
program.addCommand(signCommand);
program.addCommand(verifyCommand);
program.addCommand(policyCommand);
program.addCommand(rotateCommand);
program.addCommand(revokeCommand);

program.parse();
