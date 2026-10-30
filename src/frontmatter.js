/** Frontmatter YAML simples dos agentes (chave: valor, listas com "- ", textos dobrados com ">-"). */
export function frontmatter(texto) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(texto);
  if (!m) return { dados: {}, corpo: texto };
  const dados = {};
  let chave = null;
  for (const linha of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(linha);
    if (kv) {
      chave = kv[1];
      const valor = kv[2].trim();
      dados[chave] = ['', '>', '>-', '|', '|-'].includes(valor) ? '' : valor.replace(/^(["'])(.*)\1$/, '$2');
      continue;
    }
    const item = /^\s+-\s+(.*)$/.exec(linha);
    if (item && chave) {
      dados[chave] = [...(Array.isArray(dados[chave]) ? dados[chave] : []), item[1].trim()];
    } else if (chave && /^\s+\S/.test(linha) && typeof dados[chave] === 'string') {
      dados[chave] = `${dados[chave]} ${linha.trim()}`.trim();
    }
  }
  return { dados, corpo: texto.slice(m[0].length) };
}

/** Ferramentas do frontmatter como lista; null quando o agente não restringe (no Claude Code, isso é acesso a todas). */
export function listaFerramentas(valor) {
  if (Array.isArray(valor)) return valor.length ? valor : null;
  if (typeof valor !== 'string' || !valor.trim()) return null;
  return valor.split(',').map((f) => f.trim()).filter(Boolean);
}
