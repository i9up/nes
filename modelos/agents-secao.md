<!-- nes:inicio -->
## Time NES ({{nivel}})

Contratos em `.claude/agents/`; método em `docs/nes/METODOLOGIA.md` (só quando precisar).
{{papeis}}

Fluxo: Maestro decompõe{{#openspec}} (`/opsx:propose`){{/openspec}} → {{#arquiteto}}Arquiteto decide a estrutura → {{/arquiteto}}Executor implementa{{#openspec}} (`/opsx:apply`){{/openspec}}{{#ponytail}} com o Ponytail ativo{{/ponytail}} → Crivo roda o gate{{#ponytail}} e o `/ponytail-review`{{/ponytail}}{{#cronista}} → Cronista registra{{#openspec}} e arquiva (`/opsx:archive`){{/openspec}}{{/cronista}}.
Gate do Crivo: {{gateLinha}}. Decisão sem regra escrita escala para {{aprovador}} (NES-002); merge em produção só com aprovação humana.
<!-- nes:fim -->
