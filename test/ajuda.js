import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { definirIdioma } from '../src/i18n.js';

// Os testes rodam em português, qualquer que seja o idioma da máquina; os de inglês pedem o idioma explicitamente.
process.env.NES_IDIOMA = 'pt';
definirIdioma('pt');

/** Pasta temporária com os arquivos dados ({ 'caminho/relativo': 'conteúdo' }). */
export function projeto(arquivos = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'nes-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const alvo = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    fs.writeFileSync(alvo, conteudo, 'utf8');
  }
  return raiz;
}

export const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
export const existe = (raiz, rel) => fs.existsSync(path.join(raiz, rel));

/** Agente com contrato completo, para os testes. */
export const AGENTE_COMPLETO = `---
name: fiscal
description: Emite notas fiscais.
tools: Read, Bash
---

## Identidade e escopo
Emite NF-e. **Não cobre:** cadastro de produto.

## Ferramentas
- Read: ler a venda.
- Bash: chamar a API fiscal.

## Contexto obrigatório
- docs/fiscal.md

## Perímetro de autonomia
Nível 2. Escala para o Alessandro quando a SEFAZ rejeitar.

## Critério de avaliação
- Rejeições: meta abaixo de 1%.
`;
