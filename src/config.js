// nes.json: as decisões do time (nível alvo, aprovador, papéis, fluxo, gate do Crivo) e o que foi declarado.
import fs from 'node:fs';
import path from 'node:path';

export const ARQUIVO_CONFIG = 'nes.json';

/** null quando não existe; { invalido: true } quando existe mas não é JSON. */
export function lerConfigNes(raiz) {
  const arquivo = path.join(raiz, ARQUIVO_CONFIG);
  if (!fs.existsSync(arquivo)) return null;
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return { invalido: true }; }
}

export function gravarConfigNes(raiz, config) {
  fs.writeFileSync(path.join(raiz, ARQUIVO_CONFIG), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
