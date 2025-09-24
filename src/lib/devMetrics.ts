// @ts-nocheck
// Small dev bootstrap to enable console JSON metrics in local development.
// This file intentionally uses require() to stay compatible with server runtime.
try {
  const env = process.env.NODE_ENV || 'development';
  if (env !== 'production') {
    const { setReporter, createConsoleJsonReporter } = require('./metrics');
    // attach reporter with a recognizable prefix so logs can be filtered
    setReporter(createConsoleJsonReporter({ prefix: 'METRIC: ' }));
    // eslint-disable-next-line no-console
    console.log('devMetrics: attached console JSON reporter');
  }
} catch (e) {
  // do not crash the app if metrics wiring fails
  // eslint-disable-next-line no-console
  console.error('devMetrics init failed', String(e));
}

// Export nothing (module is side-effecting). Keep as ES export to avoid TS redeclare errors.
export {};