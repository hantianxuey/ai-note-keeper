import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const project = process.argv[2];
if (!project || !['frontend', 'backend'].includes(project)) {
  console.error('Usage: node scripts/ci/check-incremental-coverage.mjs <frontend|backend>');
  process.exit(1);
}

const threshold = Number(process.env.INCREMENTAL_COVERAGE_THRESHOLD || 60);
const repoRoot = exec('git rev-parse --show-toplevel');
const coveragePath = path.join(repoRoot, project, 'coverage', 'coverage-final.json');

if (!existsSync(coveragePath)) {
  console.error(`Missing coverage report: ${coveragePath}`);
  process.exit(1);
}

const baseRef = resolveBaseRef();
const diff = exec(`git diff --unified=0 --no-color ${baseRef}...HEAD -- ${project}/src`);
const changedRanges = parseChangedRanges(diff, project);

if (changedRanges.size === 0) {
  console.log(`[${project}] No changed source lines to check for incremental coverage.`);
  process.exit(0);
}

const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
let total = 0;
let covered = 0;
const fileSummaries = [];

for (const [relativeFile, ranges] of changedRanges) {
  const absoluteFile = path.resolve(repoRoot, relativeFile);
  const fileCoverage = coverage[absoluteFile] || coverage[normalizePath(absoluteFile)];

  if (!fileCoverage) {
    const coverableLines = ranges.reduce((sum, range) => sum + range.end - range.start + 1, 0);
    total += coverableLines;
    fileSummaries.push({ relativeFile, covered: 0, total: coverableLines });
    continue;
  }

  const touchedStatements = new Set();
  for (const [statementId, statementRange] of Object.entries(fileCoverage.statementMap || {})) {
    if (ranges.some((range) => overlaps(statementRange, range))) {
      touchedStatements.add(statementId);
    }
  }

  const fileTotal = touchedStatements.size;
  const fileCovered = [...touchedStatements].filter((id) => fileCoverage.s?.[id] > 0).length;
  total += fileTotal;
  covered += fileCovered;
  fileSummaries.push({ relativeFile, covered: fileCovered, total: fileTotal });
}

if (total === 0) {
  console.log(`[${project}] Changed lines do not contain coverable statements.`);
  process.exit(0);
}

const percent = (covered / total) * 100;
for (const summary of fileSummaries) {
  if (summary.total > 0) {
    const filePercent = ((summary.covered / summary.total) * 100).toFixed(2);
    console.log(`${summary.relativeFile}: ${filePercent}% (${summary.covered}/${summary.total})`);
  }
}

console.log(`[${project}] Incremental coverage: ${percent.toFixed(2)}% (${covered}/${total}), threshold: ${threshold}%`);

if (percent < threshold) {
  process.exit(1);
}

function resolveBaseRef() {
  const candidates = [
    process.env.COVERAGE_BASE_REF,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : '',
    'origin/main',
    'HEAD~1',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      exec(`git rev-parse --verify ${candidate}`);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  console.error('Cannot resolve a base ref for incremental coverage.');
  process.exit(1);
}

function parseChangedRanges(diffText, projectName) {
  const rangesByFile = new Map();
  let currentFile = '';

  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    if (!currentFile.startsWith(`${projectName}/src/`)) {
      continue;
    }

    if (/\.(test|spec)\.[tj]sx?$/.test(currentFile) || /\.d\.ts$/.test(currentFile)) {
      continue;
    }

    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!hunkMatch) {
      continue;
    }

    const start = Number(hunkMatch[1]);
    const length = Number(hunkMatch[2] || 1);
    if (length === 0) {
      continue;
    }

    if (!rangesByFile.has(currentFile)) {
      rangesByFile.set(currentFile, []);
    }
    rangesByFile.get(currentFile).push({ start, end: start + length - 1 });
  }

  return rangesByFile;
}

function overlaps(statementRange, changedRange) {
  return statementRange.start.line <= changedRange.end && statementRange.end.line >= changedRange.start;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function exec(command) {
  return execSync(command, {
    cwd: repoRootSafe(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function repoRootSafe() {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}
