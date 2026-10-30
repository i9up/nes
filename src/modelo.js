// Modelos com {{var}}, {{#flag}}...{{/flag}} (se verdadeiro) e {{^flag}}...{{/flag}} (se falso), sem aninhar a mesma flag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASTA_MODELOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'modelos');

export function renderizar(texto, vars) {
  let saida = texto.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (_, tipo, nome, dentro) => (Boolean(vars[nome]) === (tipo === '#') ? dentro : ''));
  saida = saida.replace(/\{\{(\w+)\}\}/g, (_, nome) => String(vars[nome] ?? ''));
  return saida.replace(/\n{3,}/g, '\n\n');
}

export function lerModelo(relativo) {
  return fs.readFileSync(path.join(PASTA_MODELOS, relativo), 'utf8');
}
