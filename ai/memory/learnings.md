# Agent Learnings — SM-Portal

Accumulated lessons from working in this project.
Read this file at the start of each session. Newest-first.

---
- 2026-10-07 (f1872f5) [pitfall] Caught only HttpRequestException; BrokenCircuitException and timeouts became 500s. Map 502/504 explicitly. Vault: learnings/cross-project/2026-10-07-circuit-breakers-fail-at-their-edges-what-counts-as-a-failure-and-what-the-caller-catches.md
- 2026-10-06 (0c423c9) [pitfall] Fresh checkout did not build (tsconfig ignoreDeprecations 6.0; lock file out of sync) and UAT was hand-patched. Builds must pass npm ci from clean. Vault: learnings/cross-project/2026-10-07-a-hand-edited-server-masked-three-broken-release-artifacts-until-a-clean-deploy.md
- 2026-10-14 (b7732ba) [pitfall] rbac-config.json never loaded: camelCase file vs PascalCase records and a case-sensitive deserialiser; found only by a test using the real file. Tests with a fake provider cannot see config binding. Vault: learnings/sm-portal/2026-10-14-a-config-file-bound-to-nothing-passed-every-test-because-the-tests-used-a-fake-provider.md
- 2026-10-14 (b7732ba) [risk] M3 endpoint RBAC compares AD group NAMES with role claims; Windows tokens carry SIDs - unproven until tested with a real NTLM token. Vault: risks/sm-portal-m3-endpoint-rbac-compares-ad-group-names-with-role-claims-while-windows-tokens-carry-sids.md
