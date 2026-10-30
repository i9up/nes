#!/usr/bin/env node
// NES: o método de A Nova Engenharia de Software aplicado ao repositório.
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { executar } from '../src/cli.js';

const rl = stdin.isTTY ? readline.createInterface({ input: stdin, output: stdout }) : null;
const perguntar = rl ? (q) => rl.question(q) : null;
try {
  const { texto, codigo } = await executar(process.argv.slice(2), { cwd: process.cwd(), perguntar });
  if (texto) console.log(texto);
  process.exitCode = codigo;
} finally {
  rl?.close();
}
