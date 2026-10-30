---
name: {{nome}}
description: <Purpose in one sentence. Say when to use this agent.>
tools: Read, Glob, Grep
---

# {{nome}}

## Identity and scope
<What the agent does, in one sentence.>
**Does not cover:** <what is left out and who it hands that to>.

## Tools
- Read, Glob, Grep: <why it needs each one; add only what is necessary (least privilege)>.

## Required context
- <What to consult before deciding, where it lives and who keeps it up to date.>

## Autonomy perimeter
Level <1 to 4>: <1 suggests; 2 executes with prior approval; 3 executes with later audit; 4 autonomous with flagged exceptions>.
**Escalates to <approver>** when <the exact trigger>.

## Evaluation criteria
- <Metric>: target <value>, defined before the agent goes into use.
