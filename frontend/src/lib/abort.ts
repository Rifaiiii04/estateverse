// Rejects cancelled operations on browsers that implement AbortSignal without throwIfAborted or reason.
export function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Operasi dibatalkan.", "AbortError");
}
