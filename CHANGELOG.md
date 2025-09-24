# Changelog

## Unreleased

- Observability: added pluggable metrics hooks and a built-in dev console JSON reporter.
  - Files changed:
    - `src/lib/metrics.ts` — pluggable metrics API (`setReporter`, `metrics.report`) and `createConsoleJsonReporter` factory.
    - `src/lib/devMetrics.ts` — dev bootstrap that attaches the console JSON reporter when NODE_ENV !== 'production'.
    - `src/app/layout.tsx` — server-side import to initialize dev reporter on bootstrap.
    - `tests/unit/metrics.console.test.ts` — unit test proving console reporter is invoked.
    - `README.md` — examples for OpenTelemetry, Datadog, and Prometheus exporter wiring.

  - Purpose: Provide immediate local visibility for the admin rate limiter and a clear path to forward metrics to production telemetry systems.

  - Rollout: Dev reporter attaches automatically in non-production. To enable in production, attach a production reporter via `setReporter()` during server bootstrap.

  - Follow-ups:
    - Add a runnable server/bootstrap example for Prometheus/OpenTelemetry.
    - Add concurrency/integration tests for high-throughput reporter behavior.
