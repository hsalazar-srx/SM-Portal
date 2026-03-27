# SM-Portal: Claude Code Instructions

**Project:** Scanfil APAC Portal — .NET 8 + React/TypeScript
**Critical:** Read [ai/rules.md](ai/rules.md) FIRST

---

## Multi-Agent System (MAS)

**Primary Agents:**
- **@expert-movex-dotnet** — M3 transactions, MOVEX database, business rules
- **@developer-dotnet** — .NET API + React/TS frontend implementation
- **@architect-system-design** — ADRs, design reviews, architecture decisions

**Process Agents:**
- **@validator-quality** — Security review, quality gates
- **@validator-iis-deploy** — IIS pre-deployment validation

**Skill definitions:** `C:\Projects\.github\skills\manifest.json`

---

## Adaptive Learning

**Before starting significant work**, check for prior lessons:
1. Read `ai/memory/learnings.md` for accumulated project learnings
2. Run `/cognee-query` with your specific question for deeper context
3. For bug fixes: check if the broken behavior was an assumption in any ADR

**After completing significant work**, capture what you learned:
- Run `/capture-learning` to record pitfalls, patterns, quirks, or mistakes
- This feeds the cognee knowledge graph so future sessions start with context

---

## Session Checklist

**Start:** Read ai/rules.md → Read ai/memory/learnings.md → /plan for complex tasks
**During:** Check skills manifest → Write tests → /compact at 50%
**End:** Tests pass → No credentials/PII → /capture-learning if applicable → Commit → Push to feature branch

---

## Key References

| Quick Access | Detailed Knowledge |
|---|---|
| [ai/rules.md](ai/rules.md) | [ai/memory/](ai/memory/) |
| [ai/checklists/](ai/checklists/) | [ai/planning/](ai/planning/) |
| [ai/tasks/](ai/tasks/) | [ai/evidence/](ai/evidence/) |

---

**Version:** 1.0
**Last Updated:** 2026-03-26
