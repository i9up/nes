<!-- nes:inicio -->
## NES team ({{nivel}})

Contracts in `.claude/agents/`; method in `docs/nes/METHODOLOGY.md` (only when needed).
{{papeis}}

Flow: Maestro breaks it down{{#openspec}} (`/opsx:propose`){{/openspec}} → {{#arquiteto}}Architect decides the structure → {{/arquiteto}}Executor implements{{#openspec}} (`/opsx:apply`){{/openspec}}{{#ponytail}} with Ponytail on{{/ponytail}} → Crivo runs the gate{{#ponytail}} and `/ponytail-review`{{/ponytail}}{{#cronista}} → Cronista records{{#openspec}} and archives (`/opsx:archive`){{/openspec}}{{/cronista}}.
Crivo gate: {{gateLinha}}. A decision with no written rule escalates to {{aprovador}} (NES-002); merging to production needs human approval.
<!-- nes:fim -->
