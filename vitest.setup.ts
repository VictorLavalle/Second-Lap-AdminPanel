import "@testing-library/jest-dom/vitest";

// Deterministic secrets for session crypto/signing in tests. 32-byte keys,
// base64-encoded, as the production code expects.
process.env.SESSION_SECRET ??= Buffer.alloc(32, 7).toString("base64");
process.env.SESSION_SIGNING_SECRET ??= "test-signing-secret";

// jsdom does not implement URL.createObjectURL; preview rendering needs it.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => undefined;
}

// jsdom does not implement <dialog> showModal/close. Provide a minimal polyfill
// so components using the native dialog can be tested.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
}
