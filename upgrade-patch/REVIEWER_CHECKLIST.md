# Reviewer Checklist

- [ ] Unit tests pass locally / in CI: `npm run test:unit`
- [ ] Integration tests run and pass: `npm run test:integration`
- [ ] Rules/emulator tests run and pass: `npm run test:rules:exec`
- [ ] Smoke tests on staging:
  - [ ] `/discover` loads without runtime errors
  - [ ] Admin login/session exchange works
  - [ ] Admin actions (delete-shot, logout) succeed and create `adminActions` audit logs
  - [ ] Rate limiter behavior observed and acceptable
- [ ] Monitor logs/alerts for the first hour post-deploy

# Notes
If you prefer a lockfile commit, request the targeted npm/node version and a `package-lock.json` will be generated for that environment.
