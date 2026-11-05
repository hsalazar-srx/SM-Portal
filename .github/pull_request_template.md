<!-- PR title: Conventional Commits, e.g. "feat: per-department report roles". Write N/A rather than deleting a section. -->

## Summary
<!-- Why this change is needed, then what it does. 1-3 sentences. -->

## Type of Change
- [ ] Bug fix (`fix`)
- [ ] New feature (`feat`)
- [ ] Refactor / chore / test
- [ ] Documentation or ADR
- [ ] Breaking change (API contract, config schema, role names or AD group mappings)

## Related
Closes #(issue number) · ADR / vault learning:

## Changes Made
- 

## Testing
<!-- Paste results, e.g. "dotnet test: 142 passed". -->
- [ ] Test written first, then the change
- [ ] `dotnet test tests/MovexPortal.Tests.csproj` passes
- [ ] `npm run lint` and `npm run build` pass (if `frontend/` changed)
- [ ] Config changes (`config/*.json`) covered by a test that loads the real file
- [ ] Manual check — environment and steps:

## Checklist
- [ ] New or changed endpoints have an RBAC check, audit logging and masked sensitive fields
- [ ] No secrets, PII, customer identifiers or hardcoded URLs / M3 company numbers
- [ ] Deployment impact noted (server config, `web.config`, env vars) — or none
- [ ] Docs, runbook or ADR updated where behaviour or decisions changed
- [ ] Self-review done; no `TODO` without a reference

## Screenshots
<!-- UI changes only: before / after. -->

## Notes for Reviewers
<!-- Where to focus, rollback steps if risky, known limitations, follow-ups. -->
