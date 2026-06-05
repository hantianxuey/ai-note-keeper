#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const checks = [
  ['local', 'backend', true],
  ['local', 'frontend', true],
  ['ci', 'backend', false],
  ['ci', 'frontend', false],
  ['production', 'backend', true],
  ['production', 'frontend', true],
];

for (const [envName, target, allowExamplePrivate] of checks) {
  const args = ['scripts/iac/render-env.mjs', '--env', envName, '--target', target, '--print'];
  if (allowExamplePrivate) args.push('--allow-example-private');
  const output = execFileSync(process.execPath, args, { encoding: 'utf8' });
  if (!output.trim()) {
    throw new Error(`No env output for ${envName}/${target}`);
  }

  if (envName === 'production' && target === 'frontend' && !output.includes('VITE_API_URL=/api')) {
    throw new Error('Production frontend must use same-origin /api');
  }
}

console.log('IaC env rendering checks passed.');
