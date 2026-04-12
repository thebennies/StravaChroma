#!/usr/bin/env node
// CalVer bumper: YYYY.MM.PATCH
// - Same year+month as current version → increment PATCH
// - New year or month → reset to YYYY.MM.0

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');

const [curYear, curMonth, curPatch] = pkg.version.split('.');
const sameMonth = String(curYear) === String(year) && String(curMonth) === month;

const newPatch = sameMonth ? parseInt(curPatch, 10) + 1 : 0;
const newVersion = `${year}.${month}.${newPatch}`;

pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

console.log(`${pkg.version.replace(newVersion, '')}${newVersion}  (was ${curYear}.${curMonth}.${curPatch})`);
