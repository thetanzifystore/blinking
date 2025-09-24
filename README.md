Observability (dev metrics)

This project includes a tiny, opt-in observability hook for the admin rate limiter.

Developer quickstart

- A JSON console reporter is attached automatically in non-production when running the app (server bootstrap). This gives immediate local visibility in your terminal and emits single-line JSON logs suitable for ingestion by ELK/Datadog/CloudWatch.

Programmatic usage

- To attach a custom reporter (for example, OpenTelemetry or a Datadog exporter), call setReporter() from `src/lib/metrics` at your server bootstrap:

  const { setReporter } = require('./src/lib/metrics');
  setReporter({ report: (m) => { /* send to your backend */ } });

Notes

- The built-in console JSON reporter is NOT enabled in production by default; it is only attached automatically when NODE_ENV !== 'production'.
- Reporter errors are swallowed to ensure they don't interfere with request handling.

Metric names emitted by the limiter

- `admin.rate_limiter.attempt` — emitted after incrementAttempt; payload includes `ip`, `count`, `blockedUntil`, and `windowMs`.
- `admin.rate_limiter.check` — emitted on calls to isRateLimited; payload includes `ip`, `count`, `blockedUntil`, `now`, and `isLimited`.

Future

- You can replace the console reporter with an OpenTelemetry or Prometheus exporter via `setReporter()`.

Exporter examples (production)

OpenTelemetry (Node) example - send limiter events as OTLP logs/metrics:

```js
// server/bootstrap.js
const { setReporter } = require('./src/lib/metrics');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPLogExporter } = require('@opentelemetry/exporter-otlp-http');

const sdk = new NodeSDK({ /* configure traces/metrics/logs exporters */ });
sdk.start();

// Simple reporter that converts limiter events into OTLP logs or metrics
setReporter({
  report: (m) => {
    // Convert to OTLP log record or custom metric as you prefer
    // Example: send JSON to OTLP log exporter endpoint (pseudo)
    const exporter = new OTLPLogExporter();
    exporter.export(JSON.stringify(m));
  },
});
```

Datadog example - send JSON events or custom metrics:

```js
// server/bootstrap.js
const { setReporter } = require('./src/lib/metrics');
const dd = require('datadog-metrics');
dd.init({ host: 'my-service', prefix: 'myapp.' });

setReporter({
  report: (m) => {
    // Emit an event-level metric or log. Use tags to include ip/block info.
    dd.increment('admin.rate_limiter.attempt', 1, [`ip:${m.ip}`]);
    // Optionally send a JSON event via Datadog events API for detailed audits
  },
});
```

Prometheus (Pushgateway) example - convert limiter events to counters/gauges:

```js
// server/bootstrap.js
const { setReporter } = require('./src/lib/metrics');
const client = require('prom-client');
const attempts = new client.Counter({ name: 'admin_rate_limiter_attempts_total', help: 'Attempts', labelNames: ['ip'] });

setReporter({
  report: (m) => {
    if (m.name === 'admin.rate_limiter.attempt') {
      attempts.labels(m.ip || 'unknown').inc(m.count || 1);
    }
  },
});

// If using Pushgateway, push periodically
const gateway = new client.Pushgateway('http://pushgateway:9091');
setInterval(() => gateway.pushAdd({ jobName: 'blinking-admin' }), 15000);
```

Keep it simple: pick one exporter and attach it once at server bootstrap with `setReporter()`. The built-in console JSON reporter is a useful local default and easily replaceable in production.

Firebase setup guard

The app validates required public Firebase env vars at startup. To run the app locally, create a `.env.local` (or copy `.env.example`) at the repository root with your Firebase Web SDK config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

If these are missing the app will throw a clear startup error telling you which keys are required.
