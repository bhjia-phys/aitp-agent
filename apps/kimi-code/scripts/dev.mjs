#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startPluginMarketplaceServer } from './dev-plugin-marketplace-server.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIR, '..');
const MARKETPLACE_ENV = 'KIMI_CODE_PLUGIN_MARKETPLACE_URL';

let marketplaceServer;
const env = { ...process.env };

if (env[MARKETPLACE_ENV] === undefined || env[MARKETPLACE_ENV]?.trim().length === 0) {
  marketplaceServer = await startPluginMarketplaceServer();
  env[MARKETPLACE_ENV] = marketplaceServer.marketplaceUrl;
  console.error(`Plugin marketplace dev server: ${marketplaceServer.marketplaceUrl}`);
}

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === '--') cliArgs.shift();
const tsxArgs = ['--import', '../../build/register-raw-text-loader.mjs', './src/main.ts', ...cliArgs];
const invocation = commandInvocation('tsx', tsxArgs);
const child = spawn(invocation.executable, invocation.args, {
  cwd: APP_ROOT,
  env,
  stdio: 'inherit',
});

child.on('error', async (error) => {
  console.error(`Failed to start Kimi Code dev CLI: ${error.message}`);
  await marketplaceServer?.close();
  process.exit(1);
});

child.on('exit', async (code, signal) => {
  await marketplaceServer?.close();
  if (signal !== null) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

function commandInvocation(command, args) {
  if (process.platform !== 'win32') {
    return {
      executable: command,
      args,
    };
  }

  const workspaceBin = resolve(APP_ROOT, '..', '..', 'node_modules', '.bin');
  const localCmd = join(workspaceBin, `${command}.cmd`);
  const executable = existsSync(localCmd) ? localCmd : `${command}.cmd`;
  const shell = process.env.ComSpec ?? 'cmd.exe';
  const shellCommand = executable.includes(' ') ? `"${executable}"` : executable;
  return {
    executable: shell,
    args: ['/d', '/s', '/c', shellCommand, ...args],
  };
}
