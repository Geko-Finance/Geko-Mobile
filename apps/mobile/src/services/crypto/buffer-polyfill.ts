import { Buffer } from "buffer";

/**
 * Makes `Buffer.prototype.subarray` return a Buffer on Hermes, as it does on Node.
 *
 * Hermes ignores `Symbol.species` on typed arrays, so the `buffer` package's Buffer
 * inherits a `subarray` that returns a plain Uint8Array. `@stellar/js-xdr` 4 (pulled in
 * by `@stellar/stellar-sdk` 16) finalizes every serialization with
 * `writer._buffer.subarray(...)` and then calls `.toString("base64")` on the result -
 * on a plain Uint8Array that yields "0,0,0,2,..." instead of base64. Every
 * `toXDR("base64")` is then corrupted, and reading it back fails with "unknown
 * EnvelopeType member", which surfaced as a generic "check your PIN" error on every
 * self-custody signature. Jest runs on Node, so tests never saw it.
 */
export function patchBufferSubarray(BufferClass: { prototype: Uint8Array }): void {
  const prototype = BufferClass.prototype as Uint8Array & { __gekoSubarrayPatched?: true };

  if (prototype.__gekoSubarrayPatched === true) {
    return;
  }

  const nativeSubarray = Uint8Array.prototype.subarray;

  Object.defineProperty(prototype, "subarray", {
    configurable: true,
    writable: true,
    value: function subarray(this: Uint8Array, begin?: number, end?: number): Uint8Array {
      const view = nativeSubarray.call(this, begin, end);

      if (Object.getPrototypeOf(view) !== BufferClass.prototype) {
        Object.setPrototypeOf(view, BufferClass.prototype);
      }

      return view;
    },
  });
  Object.defineProperty(prototype, "__gekoSubarrayPatched", { value: true });
}

patchBufferSubarray(Buffer);
