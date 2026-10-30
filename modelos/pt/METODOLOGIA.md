# Método NES, resumido

Resumo operacional de *A Nova Engenharia de Software* (Alessandro Medeiros, Coleção NES, Vol. 1). Os capítulos citados
aprofundam cada ponto. Este arquivo é lido sob demanda, não em toda sessão.

## Os 3 princípios

- **NES-001 · Organização antes da automação.** Não se automatiza o caos (cap. 1).
- **NES-002 · Automatize decisões explícitas, não ambiguidades ocultas.** Decisão que não está escrita não é tomada
  pelo agente: ele escala ao humano (cap. 2).
- **NES-003 · Especialização produz qualidade.** Um time de especialistas com escopo claro supera o agente faz-tudo (cap. 3).

## Contrato de agente (cap. 8)

1. **Identidade e escopo**, incluindo o que o agente não cobre.
2. **Ferramentas concedidas**, cada uma com justificativa (menor privilégio).
3. **Contexto obrigatório**: o que consultar, onde vive, como é mantido.
4. **Perímetro de autonomia**: o nível e o gatilho exato de escalada.
5. **Critério de avaliação**: métricas e metas definidas antes do uso.

Confira com `nes contrato`.

## Níveis de autonomia (cap. 9)

| Nível | O agente |
|---|---|
| 1 · Sugestão | analisa e recomenda; o humano executa |
| 2 · Execução com aprovação prévia | prepara a ação; executa após aprovação, caso a caso |
| 3 · Execução com auditoria posterior | executa no perímetro; a supervisão é por amostragem |
| 4 · Autônomo com exceção sinalizada | executa livremente; escala só o que sai do perímetro |

Subir de nível exige métrica objetiva, piloto em área de menor risco, critério de rollback definido antes e um
responsável pela transição.

## Maturidade (cap. 21)

| Nível | Critério mínimo para chegar |
|---|---|
| M1 · Assistentes | parte da equipe usa IA regularmente |
| M2 · Agentes Especializados | um agente com contrato documentado, em uso real, com observabilidade mínima |
| M3 · Times de Agentes | dois ou mais especialistas coordenados de forma formal, sem coordenação heroica |
| M4 · Software Factory Inteligente | backlog inteligente, refatoração segura e segurança formal além da primeira área |
| M5 · Organização Cognitiva | os loops de aprendizado ativos e medidos ao longo de trimestres |

Partes do projeto podem estar em níveis diferentes. Confira com `nes maturidade`.

## O time

| Papel | Faz | Não faz |
|---|---|---|
| Maestro | decompõe, delega, escala | código, aprovação, arquitetura sozinho |
| Arquiteto | estrutura e contratos entre módulos | implementação |
| Executor | implementa a tarefa, com testes | ampliar escopo, aprovar a própria entrega |
| Crivo | roda o gate e aprova ou bloqueia com motivo | corrigir o código |
| Cronista | registra a decisão no Capital Cognitivo | julgar a decisão |

Regra invariante: **nada vai para produção sem aprovação humana** ("manual merge always").
