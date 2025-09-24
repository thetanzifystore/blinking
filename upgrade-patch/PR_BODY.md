## PR: upgrade firebase-admin → 13.5.0 (security) + fix /discover runtime error

### Summary
- Upgrade `firebase-admin` to **13.5.0** to remediate a critical protobufjs → google-gax → @google-cloud/firestore vulnerability chain.
- Fix `/discover` runtime error by ensuring the modular Firestore `collection()` receives a real `Firestore` instance via `getDb()`.

### What changed
- package.json: `firebase-admin` → `^13.5.0`
- `src/lib/firebase.ts`: added `export function getDb()` that returns a concrete Firestore instance.
- `src/app/discover/page.tsx`: updated to call `mod.getDb()` (falls back to `mod.db`) before `collection(db, "shots")`.

### Tests & verification
- Unit tests: **6 / 6 passing** (run locally): `npm run test:unit`
- Integration tests: pending — run in CI/local with services: `npm run test:integration`
- Firestore rules/emulator tests: pending — run with emulator: `npm run test:rules:exec`
- Security: `npm audit` locally reports 0 critical vulnerabilities after the upgrade.

### CI / Staging checklist (required before merge)
- [ ] CI: Unit tests pass
- [ ] CI: Integration tests pass (`npm run test:integration`)
- [ ] CI: Rules/emulator tests pass (`npm run test:rules:exec`)
- [ ] Staging: Manual smoke tests pass (see checklist)
- [ ] Staging: Monitor logs/alerts for at least 1 hour after deploy

### Smoke tests (manual)
- Start app or staging
- Visit `/discover` and ensure no runtime error
- Admin flows: login, session exchange, delete-shot; confirm audit logs in `adminActions`
- Rate limiter: exercise an admin endpoint repeatedly and confirm expected backoff

### Risk & Rollback
- Risk: Low. Dependency upgrade is server-side admin SDK; only one minor correctness change made.
- Rollback: revert commit(s) that update `package.json` and revert the code changes in `src/lib/firebase.ts` and `src/app/discover/page.tsx`.

### Notes for reviewers
- Security fix is high priority; recommend fast-tracking this PR
- If your policy requires committing `package-lock.json` for a specific npm version, tell me which npm/node to target and I can provide a lockfile.

---

(Attach this as the PR body when creating the PR on GitHub; see `upgrade-patch/CHANGELOG_ENTRY.md` for the changelog line.)