// @ts-nocheck
// Lightweight metrics reporter compatible with CommonJS require()
/** @typedef {{ name: string } & Record<string, any>} Metric */

/** @typedef {{ report: (m: any) => void } | null} Reporter */

let reporter = null;

const setReporter = (r) => {
  reporter = r;
};

const metrics = {
  setReporter,
  report(m) {
    try {
      if (reporter && typeof reporter.report === 'function') {
        reporter.report(m);
      }
    } catch (e) {
      // swallow reporter errors
      // eslint-disable-next-line no-console
      console.error('metrics reporter error', String(e));
    }
  },
};

// Built-in JSON console logger factory (not enabled by default).
function createConsoleJsonReporter(opts) {
  const prefix = (opts && opts.prefix) || '';
  return {
    report(m) {
      try {
        const out = Object.assign({ ts: Date.now() }, m);
        // Print a single-line JSON string for easy ingestion by log collectors
        console.log(prefix + JSON.stringify(out));
      } catch (e) {
        // swallow console serialization errors
        // eslint-disable-next-line no-console
        console.error('consoleJsonReporter error', String(e));
      }
    },
  };
}

module.exports = { metrics, setReporter, createConsoleJsonReporter };
