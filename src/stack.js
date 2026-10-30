// Stack de cada pasta (raiz e apps) e o comando de teste que o Crivo roda. Delphi não tem runner padrão: o usuário confirma.
import fs from 'node:fs';
import path from 'node:path';
import { encontrarApps, lerConfig } from '@i9up/fengshui/src/medir.js';

const SEM_TESTE = /no test specified/;

const REGRAS = [
  { stack: 'node', tem: (a) => a.includes('package.json'), teste: (pasta, rel) => {
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(pasta, 'package.json'), 'utf8')); } catch { /* package.json inválido: sem teste */ }
    const script = pkg.scripts?.test;
    if (!script || SEM_TESTE.test(script)) return null;
    return rel === '.' ? 'npm test' : `npm --prefix ${rel} test`;
  } },
  { stack: 'delphi', tem: (a) => a.some((f) => /\.(dproj|dpr)$/i.test(f)), teste: () => null, confirmar: 'runner DUnitX (ex.: Tests\\Win32\\Debug\\ProjetoTests.exe)' },
  { stack: 'python', tem: (a) => a.some((f) => ['pyproject.toml', 'requirements.txt', 'setup.py'].includes(f)), teste: (_, rel) => (rel === '.' ? 'pytest' : `pytest ${rel}`) },
  { stack: 'go', tem: (a) => a.includes('go.mod'), teste: (_, rel) => (rel === '.' ? 'go test ./...' : `go test ./${rel}/...`) },
  { stack: 'dotnet', tem: (a) => a.some((f) => /\.(sln|csproj)$/i.test(f)), teste: (_, rel) => (rel === '.' ? 'dotnet test' : `dotnet test ${rel}`) },
  { stack: 'java', tem: (a) => a.includes('pom.xml'), teste: (_, rel) => (rel === '.' ? 'mvn test' : `mvn -f ${rel} test`) },
  { stack: 'rust', tem: (a) => a.includes('Cargo.toml'), teste: (_, rel) => (rel === '.' ? 'cargo test' : `cargo test --manifest-path ${rel}/Cargo.toml`) },
];

/** Uma entrada por pasta com stack reconhecida: { pasta, stack, comando (ou null), confirmar? }. */
export function detectarStacks(raiz) {
  const pastas = [{ pasta: raiz, rel: '.' }, ...encontrarApps(raiz, lerConfig(raiz).ignorarApps).map((a) => ({ pasta: a.pasta, rel: a.relativo }))];
  const saida = [];
  for (const { pasta, rel } of pastas) {
    const arquivos = fs.readdirSync(pasta);
    const regra = REGRAS.find((r) => r.tem(arquivos));
    if (regra) saida.push({ pasta: rel, stack: regra.stack, comando: regra.teste(pasta, rel), ...(regra.confirmar ? { confirmar: regra.confirmar } : {}) });
  }
  return saida;
}

export const nomesDasStacks = (stacks) => [...new Set(stacks.map((s) => s.stack))].join(', ');
