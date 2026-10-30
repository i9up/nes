// Modelos com {{var}}, {{#flag}}...{{/flag}} (se verdadeiro) e {{^flag}}...{{/flag}} (se falso). Blocos de flags
// diferentes podem ficar um dentro do outro; a mesma flag dentro dela mesma, não.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idioma } from './i18n.js';

export const PASTA_MODELOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'modelos');

export function renderizar(texto, vars) {
  let saida = texto;
  for (let antes = ''; antes !== saida;) {
    antes = saida;
    saida = saida.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (_, tipo, nome, dentro) => (Boolean(vars[nome]) === (tipo === '#') ? dentro : ''));
  }
  saida = saida.replace(/\{\{(\w+)\}\}/g, (_, nome) => String(vars[nome] ?? ''));
  return saida.replace(/\n{3,}/g, '\n\n');
}

/** Modelo no idioma atual (modelos/pt/... ou modelos/en/...). */
export function lerModelo(relativo) {
  return fs.readFileSync(path.join(PASTA_MODELOS, idioma(), relativo), 'utf8');
}

/** Nomes dos arquivos de docs/nes/ em cada idioma. */
export const ARQUIVOS_DOCS = {
  pt: { metodologia: 'METODOLOGIA.md', capital: 'CAPITAL-COGNITIVO.md' },
  en: { metodologia: 'METHODOLOGY.md', capital: 'COGNITIVE-CAPITAL.md' },
};
