import fs from 'node:fs';
import path from 'node:path';
import { frontmatter } from './frontmatter.js';
import { avaliarContrato } from './contrato.js';

export const MARCA_GERADO = 'gerado por @i9up/nes';

/** Agentes do Claude Code em .claude/agents/*.md, já com a avaliação do contrato. */
export function lerAgentes(raiz) {
  const pasta = path.join(raiz, '.claude', 'agents');
  let arquivos = [];
  try { arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.md')).sort(); } catch { return []; }
  return arquivos.map((f) => avaliarArquivo(path.join(pasta, f), { raiz }));
}

/** Avalia um arquivo de agente qualquer. Fora de .claude/agents o acesso a ferramentas não vem do frontmatter. */
export function avaliarArquivo(arquivo, { raiz = process.cwd() } = {}) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const { dados } = frontmatter(texto);
  const ehClaude = path.basename(path.dirname(arquivo)) === 'agents' && path.basename(path.dirname(path.dirname(arquivo))) === '.claude';
  const avaliacao = avaliarContrato(texto, { ferramentasNoArquivo: ehClaude });
  return {
    nome: dados.name || path.basename(arquivo, '.md'),
    descricao: avaliacao.descricao,
    arquivo: path.relative(raiz, arquivo).split(path.sep).join('/'),
    gerado: texto.includes(MARCA_GERADO),
    texto,
    avaliacao,
  };
}
