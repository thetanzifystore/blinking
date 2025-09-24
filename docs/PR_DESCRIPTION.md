PR title: Add observability hooks and dev JSON console reporter for admin rate limiter

Summary

This PR introduces a small observability layer for the admin rate limiter so developers and operators can see limiter events locally and forward them to production telemetry systems.

What changed

- `src/lib/metrics.ts` — Pluggable metrics API: `setReporter()` and `metrics.report()` + `createConsoleJsonReporter()` factory.
- `src/lib/devMetrics.ts` — Dev bootstrap that automatically attaches the console JSON reporter when NODE_ENV !== 'production'.
- `src/app/layout.tsx` — Server-side require to initialize the dev reporter at app bootstrap.
- `tests/unit/metrics.console.test.ts` — Unit test that stubs `console.log` and verifies the console reporter is invoked.
- `README.md` — Usage and production exporter examples (OpenTelemetry, Datadog, Prometheus).
- `CHANGELOG.md` — Unreleased entry documenting the change.

Why

- Immediate local visibility for failed logins and instrumented events.
- A clear, small API to attach production exporters (OpenTelemetry, Datadog, Prometheus) without changing limiter internals.
- Keeps default behavior unchanged in production (no reporter attached unless explicitly set).

Testing performed

- Unit test suite run locally: all tests pass (6 passing).
- Verified dev reporter initialization doesn't crash the app when imported from server layout.

Rollout / Risk

- Low risk: dev reporter only attaches when NODE_ENV !== 'production'. Reporter errors are swallowed.
- Ops action: add a production reporter by calling `setReporter()` in your server bootstrap and ensure any exporter dependencies are included in the runtime image.

Follow-ups

- Add a runnable `server/bootstrap.example.js` showing a complete OpenTelemetry or Prometheus setup.
- Add a concurrency/integration test to verify reporter behavior under load.
- Optionally add severity fields and structured levels to the console reporter.

Reviewer checklist

- Sanity-check the README exporter snippets for correct package names and usage.
- Validate that the dev reporter will not be attached in production.
- Suggest any additional metrics fields you want included in limiter events (e.g., user agent, route). 
