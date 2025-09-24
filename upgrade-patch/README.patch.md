Patch for upgrading firebase-admin to 13.5.0

Recommendation (Option 2 - preferred):

- Commit only the updated `package.json` to keep this change small and let CI regenerate the lockfile.
- This stays consistent with each developer's local npm/node setup and lets your CI pipelines produce a lockfile that matches the CI environment.

Instructions (PowerShell-friendly):

1. In your local repo, create and switch to the upgrade branch:

   git checkout -b fix/deps/firebase-admin-upgrade

2. Replace the repository's `package.json` with the one from this `upgrade-patch` folder.
   - You can copy the file in PowerShell from the patch folder to the repo root (run this from the repository root):

     Copy-Item -Path .\upgrade-patch\package.json -Destination .\ -Force

   - OR open the patched `package.json` and paste the dependency changes into your repo's `package.json`.

3. Stage and commit only `package.json` (do NOT commit `package-lock.json`):

   git add package.json
   git commit -m "chore(deps): upgrade firebase-admin to 13.5.0 (security fix)"

   # If your CI requires a regenerated lockfile locally for verification, you may run `npm install` locally to update `package-lock.json` but still omit it from the commit.

4. Push the branch:

   git push -u origin fix/deps/firebase-admin-upgrade

5. Open a PR and run CI. The CI pipeline will install dependencies and regenerate a lockfile that matches the CI environment.

Notes:
- If your repository policy requires committing lockfiles, follow your normal process instead. Option 2 is preferred when you want minimal churn and let CI/lockfile-management handle the exact lockfile.
- If you want me to also produce a patch that updates `package-lock.json` for a specific npm version, tell me which npm/node version to target and I can prepare that as an alternative.
