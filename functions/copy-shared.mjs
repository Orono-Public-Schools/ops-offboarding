#!/usr/bin/env node
// Copy the repo-level shared/ sources into functions/src/shared-gen/ so tsc
// (rootDir: src) can compile them and firebase deploy packages them. Runs as
// part of `npm run build` in functions/. The copy is gitignored — shared/ at
// the repo root is the only source of truth.
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'shared');
const dest = join(here, 'src', 'shared-gen');

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('copied shared/ -> functions/src/shared-gen/');
