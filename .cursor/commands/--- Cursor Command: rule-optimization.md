--- Cursor Command: rule-optimization.md ---
Analyze our core development rules and identify improvements for AI Agent efficiency and comprehension.

CONTEXT:
- Read @development-operations.mdc and @monorepo-foundation.mdc
- Apply patterns from @prompt-improve.mdc (12 battle-tested prompt engineering techniques)
- Research @Web for modern AI agent prompt engineering patterns (2024-2025)
- Focus on rule clarity, actionability, and reduced cognitive load for LLM processing

ANALYSIS FRAMEWORK:
Evaluate each rule section against proven prompt patterns:

**From @prompt-improve.mdc (validate against these):**
1. Lead with the ask (goal stated upfront)
2. Repeat key ask at end (critical instructions reinforced)
3. Specify output shape (format requirements explicit)
4. Use clear delimiters (sections visually distinct)
5. Induce step-by-step thinking (planning before execution)
6. Ask it to plan workflow (break down complex tasks)
7. Limit/widen knowledge sources (scope boundaries clear)
8. Guide information retrieval (help agent find right context)
9. Show style/example (concrete templates provided)
10. Set correction handles (validation checkpoints built-in)
11. Tell when to stop/loop (task completion criteria clear)
12. Request hidden reasoning (when to show vs. hide thought process)

**Additional AI Effectiveness Metrics:**
- Context Efficiency: Token usage vs. information density
- Scanability: Information hierarchy for quick lookup
- Error Prevention: Built-in validation guard rails

DELIVERABLE:
Return findings as prioritized recommendations:

**HIGH IMPACT, LOW EFFORT** (Fix Immediately)
1. [Rule Section] - [Which pattern(s) it violates]
2. Before/after example using @prompt-improve pattern
3. Expected outcome (faster task completion, fewer clarification requests)

**HIGH IMPACT, HIGH EFFORT** (Strategic Restructure)
1. [Rule Pattern] - [Systemic gap vs. prompt-improve principles]
2. Dependencies (cascading rule changes needed)
3. Implementation approach (incremental vs. full rewrite)

**MEDIUM IMPACT** (Polish Pass)
1. [Formatting/Structure] - [Minor pattern alignment]
2. Quick wins (apply 1-2 prompt-improve techniques)

SPECIFIC ANALYSIS TARGETS:
- **Lead with ask**: Do TL;DR sections truly state the goal first?
- **Output shape**: Are command tables/formats specified clearly?
- **Delimiters**: Code blocks, tables, sections visually distinct?
- **Step-by-step**: Does "Step-by-step Developer Workflow" induce planning?
- **Workflow planning**: Breaking down complex tasks (e.g., "Adding New Package")?
- **Knowledge scope**: "Knowledge Boundaries" section clarity?
- **Examples**: Are concrete templates provided (e.g., CI config, package.json)?
- **Correction handles**: Validation checklists present and actionable?
- **Stop/loop**: Clear completion criteria for workflows?

EXCLUDE:
- Content changes (focus on structure/formulation only)
- Suggestions that increase verbosity without clarity gains
- Patterns that conflict with Cursor-specific AI behavior
- Advice requiring external tools/plugins

EVALUATION METRICS:
For each recommendation, estimate:
- **Pattern Compliance**: Which of 12 patterns now satisfied (list numbers)
- **Token Reduction**: Estimated % decrease (if applicable)
- **Clarity Score**: Improvement on 1-10 scale (justify with pattern reference)
- **Time-to-Action**: How much faster agent reaches correct execution

OUTPUT FORMAT:
For each finding, structure as:

[Rule Section Name]
Pattern Gap: Violates patterns #[X, Y, Z] from @prompt-improve
Current Issue: [Specific problem]
Proposed Fix: [Concrete change]
Expected Benefit: [Measurable improvement]

REMEMBER: Optimize for agent speed-to-correct-action using proven prompt patterns. Rules are for AI consumption first, human reference second.

**DO NOT WRITE ANY CODE!**
**DO NOT MODIFY THE RULES YET!**
**OUTPUT ANALYSIS ONLY.**
--- End Command ---