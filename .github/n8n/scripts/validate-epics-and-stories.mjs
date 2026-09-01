#!/usr/bin/env node
// Validates Dark Factory 1 output: epics.md append + story file paths.
// Usage:
//   node .github/n8n/scripts/validate-epics-and-stories.mjs --stdout <path-to-stdout-file> [--root <dir>]
//   echo "<captured stdout>" | node .github/n8n/scripts/validate-epics-and-stories.mjs --stdin [--root <dir>]
// Exit 0 = all checks pass, 1 = failures, 2 = usage error.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let stdoutFile = null;
let useStdin = false;
let projectRoot = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--stdout') stdoutFile = args[++i];
  else if (args[i] === '--stdin') useStdin = true;
  else if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: validate-epics-and-stories.mjs (--stdout <file> | --stdin) [--root <dir>]',
    );
    process.exit(2);
  }
}
if (!stdoutFile && !useStdin) {
  console.error(
    'Usage: validate-epics-and-stories.mjs (--stdout <file> | --stdin) [--root <dir>]',
  );
  process.exit(2);
}
if (stdoutFile && useStdin) {
  console.error('Provide exactly one of --stdout <file> or --stdin');
  process.exit(2);
}

const failures = [];
const passes = [];
const fail = (msg) => failures.push(msg);
const pass = (msg) => passes.push(msg);

const stdout = useStdin
  ? await new Promise((res, rej) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (c) => (data += c));
      process.stdin.on('end', () => res(data));
      process.stdin.on('error', rej);
    })
  : readFileSync(resolve(stdoutFile), 'utf8');

// --- Extract candidate file paths from stdout ---
const pathRegex = /\/[A-Za-z0-9_\-./]+\.(md|json)/g;
const candidates = [...new Set(stdout.match(pathRegex) ?? [])];
const storyFiles = candidates.filter((p) =>
  /_bmad-output\/implementation-artifacts\/stories\/epic-\d+\/\d+\.\d+-.+\.md$/.test(
    p,
  ),
);
const epicsFiles = candidates.filter((p) => p.endsWith('/epics.md'));

if (epicsFiles.length === 0) fail('No epics.md path found in stdout');
if (storyFiles.length === 0) fail('No story file paths found in stdout');

// --- Existence and non-empty checks ---
for (const p of [...storyFiles, ...epicsFiles]) {
  const abs = resolve(projectRoot, p);
  if (!existsSync(abs)) {
    fail(`File does not exist: ${p}`);
    continue;
  }
  if (statSync(abs).size === 0) fail(`File is empty: ${p}`);
  else pass(`File exists and non-empty: ${p}`);
}

// --- Story file structural checks ---
const requiredStorySections = [
  '# Story',
  'Status:',
  '## Story',
  '## Acceptance Criteria',
  '## Tasks / Subtasks',
  '## Dev Notes',
  '### Project Structure Notes',
  '### References',
  '## Dev Agent Record',
];
const validStatuses = new Set([
  'skip',
  'ready-for-dev',
  'review',
  'done',
  'blocked',
  'in-progress',
]);

const epicDirs = new Map(); // "epic-N" -> [storyFile, ...]

for (const p of storyFiles) {
  const abs = resolve(projectRoot, p);
  if (!existsSync(abs)) continue; // already reported above
  const content = readFileSync(abs, 'utf8');

  for (const section of requiredStorySections) {
    if (!content.includes(section)) fail(`${p}: missing section "${section}"`);
  }

  const statusMatch = content.match(/^Status:\s*(\S+)/m);
  if (!statusMatch) fail(`${p}: missing "Status:" line`);
  else if (!validStatuses.has(statusMatch[1]))
    fail(`${p}: invalid status "${statusMatch[1]}"`);
  else pass(`${p}: status "${statusMatch[1]}" valid`);

  const acMatch = content.match(
    /^## Acceptance Criteria\s*\n+((?:\d+\. .+\n?)+)/m,
  );
  if (!acMatch || acMatch[1].trim().length === 0)
    fail(`${p}: Acceptance Criteria has no numbered criteria`);

  const dirMatch = p.match(/stories\/(epic-\d+)\//);
  if (dirMatch) {
    if (!epicDirs.has(dirMatch[1])) epicDirs.set(dirMatch[1], []);
    epicDirs.get(dirMatch[1]).push({ path: p, content });
  }
}

// --- Triple ordering check per epic directory ---
for (const [dir, stories] of epicDirs) {
  const numbered = stories
    .map((s) => s.path.match(/(\d+)\.(\d+)-/))
    .filter(Boolean)
    .map((m) => ({ n: Number(m[1]), m: Number(m[2]) }));

  if (numbered.length === 0) continue;
  if (numbered.length % 3 !== 0 && numbered.length % 2 !== 0)
    fail(
      `${dir}: ${numbered.length} stories is not a multiple of 2 or 3 (triple ordering broken)`,
    );

  // NOTE: the old convention marked the red-phase unit-test story with
  // `Status: skip` at STORY level, which made DF2 never run it. The current
  // convention (see .github/instructions/generate-epics-and-stories.md) keeps
  // every triple member at `ready-for-dev`; red-phase is expressed by `.skip()`
  // markers IN the test code. Story-level status can no longer identify the
  // unit-test story, so only the count/ordering invariant above is enforced.
}

// --- epics.md contains epic entries matching story directories ---
if (epicsFiles.length > 0 && existsSync(resolve(projectRoot, epicsFiles[0]))) {
  const epicsContent = readFileSync(
    resolve(projectRoot, epicsFiles[0]),
    'utf8',
  );
  const epicsFound = [...epicsContent.matchAll(/^## Epic (\d+):/gm)].map(
    (m) => m[1],
  );
  for (const dir of epicDirs.keys()) {
    const epicNum = dir.replace('epic-', '');
    if (!epicsFound.includes(epicNum))
      fail(
        `epics.md has no "## Epic ${epicNum}:" entry but story dir ${dir} exists`,
      );
    else pass(`epics.md has Epic ${epicNum} entry for ${dir}`);
  }
}

// --- Report ---
console.log(`\n=== Validation Report ===`);
console.log(`Passes: ${passes.length}`);
for (const p of passes) console.log(`  [PASS] ${p}`);
if (failures.length > 0) {
  console.log(`\nFailures: ${failures.length}`);
  for (const f of failures) console.log(`  [FAIL] ${f}`);
  console.log(`\nRESULT: FAIL`);
  process.exit(1);
}
console.log(`\nRESULT: PASS`);
process.exit(0);
