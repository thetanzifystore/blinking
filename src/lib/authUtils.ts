export function normalizeAuthError(err: any): string {
  if (!err) return 'An unknown error occurred';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.code) return err.code;
  return String(err);
}

export function useAutoFocus() {
  // simple helper: return a ref you can pass to input to autofocus in client components
  return (el: HTMLElement | null) => {
    if (el) try { (el as HTMLElement).focus(); } catch(e) {}
  }
}
