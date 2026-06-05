#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const iacDir = path.join(root, 'deploy', 'iac');
const validEnvs = new Set(['local', 'ci', 'production']);
const validTargets = new Set(['backend', 'frontend']);

function parseArgs(argv) {
  const args = {
    env: '',
    target: '',
    out: '',
    print: false,
    allowExamplePrivate: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--env') args.env = argv[++i];
    else if (item === '--target') args.target = argv[++i];
    else if (item === '--out') args.out = argv[++i];
    else if (item === '--print') args.print = true;
    else if (item === '--allow-example-private') args.allowExamplePrivate = true;
    else throw new Error(`Unknown argument: ${item}`);
  }

  if (!validEnvs.has(args.env)) {
    throw new Error(`--env must be one of: ${Array.from(validEnvs).join(', ')}`);
  }
  if (!validTargets.has(args.target)) {
    throw new Error(`--target must be one of: ${Array.from(validTargets).join(', ')}`);
  }
  if (!args.print && !args.out) {
    throw new Error('Use --print or provide --out <path>');
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      if (index < 1) {
        throw new Error(`Invalid env line in ${path.relative(root, filePath)}: ${line}`);
      }
      return [line.slice(0, index), line.slice(index + 1)];
    });
}

function mergeLayers(layers) {
  const values = new Map();
  for (const layer of layers) {
    for (const [key, value] of parseEnvFile(layer)) {
      values.set(key, value);
    }
  }
  return values;
}

function render(values) {
  return `${Array.from(values.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
}

function resolveLayers(envName, target, allowExamplePrivate) {
  const layers = [
    path.join(iacDir, `common.${target}.env`),
    path.join(iacDir, `${envName}.${target}.public.env`),
  ].filter((filePath) => fs.existsSync(filePath));

  const privateFile = path.join(iacDir, 'private', `${envName}.${target}.env`);
  if (fs.existsSync(privateFile)) {
    layers.push(privateFile);
    return layers;
  }

  const examplePrivateFile = path.join(iacDir, `${envName}.${target}.private.env.example`);
  if (allowExamplePrivate && fs.existsSync(examplePrivateFile)) {
    layers.push(examplePrivateFile);
  }
  return layers;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const layers = resolveLayers(args.env, args.target, args.allowExamplePrivate);
  const values = mergeLayers(layers);
  const output = render(values);

  if (args.print) {
    process.stdout.write(output);
  } else {
    const outPath = path.resolve(root, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, { mode: 0o600 });
    console.log(`Wrote ${path.relative(root, outPath)} from ${layers.map((layer) => path.relative(root, layer)).join(', ')}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
