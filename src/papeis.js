// Os 5 papéis do time NES (o catálogo de 8 papéis do livro consolidado em 5) e como adotar agentes que já existem.

// `adotar`: padrões em ordem de prioridade; o primeiro que acha algum agente decide (qa-specialist antes de *-review).
export const PAPEIS = [
  { id: 'maestro', nome: 'Maestro', desde: 'M2', adotar: [/maestro|orquestr|orchestr/i, /project-?manager|coordenad/i] },
  { id: 'executor', nome: 'Executor', desde: 'M2', adotar: [/specialist|especialista|executor|developer|desenvolvedor|fullstack/i] },
  { id: 'crivo', nome: 'Crivo', desde: 'M2', adotar: [/crivo|\bqa\b|qa-/i, /review|revis/i] },
  { id: 'arquiteto', nome: 'Arquiteto', desde: 'M3', adotar: [/arquitet|architect/i] },
  { id: 'cronista', nome: 'Cronista', desde: 'M4', adotar: [/cronista|scribe/i, /documenta|knowledge|curator/i] },
];

export const casaComPapel = (papel, agente) => papel.adotar.some((r) => r.test(`${agente.nome} ${agente.descricao}`));

export const NIVEIS_ALVO = ['M2', 'M3', 'M4'];

/** Papéis ativos para o nível alvo (M2: Maestro, Executor e Crivo; M3: + Arquiteto; M4: os 5). */
export function papeisDoNivel(nivel) {
  const alvo = NIVEIS_ALVO.includes(nivel) ? nivel : 'M2';
  return PAPEIS.filter((p) => p.desde <= alvo);
}

/**
 * Agentes que já existem e cumprem cada papel. O Executor aceita vários (os especialistas); os outros, o primeiro.
 * Um agente gerado pela nes (nes-<papel>) nunca é "adotado": ele é o próprio papel.
 */
export function adotar(agentes, papeis) {
  const mapa = {};
  const usados = new Set();
  // O Executor aceita qualquer especialista, então escolhe por último (senão o qa-specialist viraria Executor).
  for (const papel of [...papeis].sort((a, b) => (a.id === 'executor') - (b.id === 'executor'))) {
    const livres = agentes.filter((a) => !a.gerado && !usados.has(a.nome));
    const padrao = papel.adotar.find((r) => livres.some((a) => r.test(`${a.nome} ${a.descricao}`)));
    if (!padrao) continue;
    const candidatos = livres.filter((a) => padrao.test(`${a.nome} ${a.descricao}`));
    const escolhidos = papel.id === 'executor' ? candidatos : [candidatos[0]];
    escolhidos.forEach((a) => usados.add(a.nome));
    mapa[papel.id] = escolhidos.map((a) => a.nome);
  }
  return mapa;
}
