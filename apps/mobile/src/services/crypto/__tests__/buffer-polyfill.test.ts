import { describe, expect, it } from "@jest/globals";

import { patchBufferSubarray } from "../buffer-polyfill";

/**
 * Hermes ignores `Symbol.species` on typed arrays, so `subarray` on a Buffer returns a
 * plain Uint8Array there (Node returns a Buffer). This class reproduces that.
 */
class HermesLikeBuffer extends Uint8Array {
  static get [Symbol.species]() {
    return Uint8Array;
  }

  toString(encoding?: string): string {
    return encoding === "hex" ? Array.from(this, (b) => b.toString(16).padStart(2, "0")).join("") : super.toString();
  }
}

describe("patchBufferSubarray", () => {
  it("makes subarray keep the Buffer type, so js-xdr's toXDR('base64') doesn't serialize '0,0,0,2,...'", () => {
    const source = new HermesLikeBuffer([0, 0, 0, 2, 9]);
    expect(source.subarray(0, 4)).not.toBeInstanceOf(HermesLikeBuffer);

    patchBufferSubarray(HermesLikeBuffer);
    const view = source.subarray(0, 4) as HermesLikeBuffer;

    expect(view).toBeInstanceOf(HermesLikeBuffer);
    expect(view.toString("hex")).toBe("00000002");
    // Still a view over the same memory, like the native subarray.
    source[3] = 7;
    expect(view[3]).toBe(7);
  });

  it("is idempotent", () => {
    patchBufferSubarray(HermesLikeBuffer);
    patchBufferSubarray(HermesLikeBuffer);

    expect(new HermesLikeBuffer([1, 2, 3]).subarray(1)).toBeInstanceOf(HermesLikeBuffer);
  });
});
