import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scanHistory = process.argv.includes('--history');

const secretPatterns = [
  { name: 'private-key', pattern: /-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
  { name: 'openai-key', pattern: /sk-[A-Za-z0-9_-]{32,}/ },
  { name: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'sensitive-env-assignment', pattern: /^\s*(export\s+)?(JWT_SECRET|API_KEY_ENCRYPTION_SECRET|REQUEST_ENCRYPTION_PRIVATE_KEY|SMTP_PASS)\s*=\s*(?!\$|replace|change-me|your_|test-|local-|ci-|development)[^\s#]+/i },
  { name: 'generic-secret-assignment', pattern: /^\s*([A-Z0-9_]*API[_-]?KEY|TOKEN|SECRET|PASSWORD)\s*=\s*(?!\$|replace|change-me|your_|test-|local-|ci-|development|example|postgres)[A-Za-z0-9_./+=-]{16,}/i },
];

const excludedPathPatterns = [
  /(^|\/)\.git(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)playwright-report(\/|$)/,
  /(^|\/)test-results(\/|$)/,
  /package-lock\.json$/,
  /\.map$/,
  /\.log$/,
];

const isExcluded = (relativePath) =>
  excludedPathPatterns.some((pattern) => pattern.test(relativePath.replace(/\\/g, '/')));

const runGit = (command) => execSync(command, { cwd: repoRoot, encoding: 'utf8' });

const scanContent = (label, content) => {
  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of secretPatterns) {
      if (rule.name === 'private-key' && line.includes('...')) {
        continue;
      }
      if (rule.pattern.test(line)) {
        findings.push(`${label}:${index + 1} ${rule.name}`);
      }
    }
  });

  return findings;
};

const scanWorkingTree = () => {
  const files = runGit('git ls-files')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !isExcluded(file));

  return files.flatMap((file) => {
    const content = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    return scanContent(file, content);
  });
};

const scanGitHistory = () => {
  const findings = [];
  const refs = runGit('git rev-list --all').split(/\r?\n/).filter(Boolean);

  for (const ref of refs) {
    const files = runGit(`git ls-tree -r --name-only ${ref}`)
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((file) => !isExcluded(file));

    for (const file of files) {
      try {
        const content = runGit(`git show ${ref}:${file}`);
        findings.push(...scanContent(`${ref.slice(0, 12)}:${file}`, content));
      } catch {
        // Binary files or paths unavailable in historical trees are skipped.
      }
    }
  }

  return findings;
};

const findings = [
  ...scanWorkingTree(),
  ...(scanHistory ? scanGitHistory() : []),
];

if (findings.length > 0) {
  console.error('Potential secrets found:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`No potential secrets found${scanHistory ? ' in tracked files or git history' : ' in tracked files'}.`);
}
