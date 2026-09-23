/**
 * Decodes the raw CCTP v2 message bytes Circle returns with an attestation, so the app
 * can check where a burn is actually going and how much it carries without trusting
 * user input or Iris's JSON field names. Layout (Circle's MessageV2 + BurnMessageV2):
 *
 * header (148 bytes): version u32 | sourceDomain u32 | destinationDomain u32 |
 *   nonce bytes32 | sender bytes32 | recipient bytes32 | destinationCaller bytes32 |
 *   minFinalityThreshold u32 | finalityThresholdExecuted u32
 * body: version u32 | burnToken bytes32 | mintRecipient bytes32 | amount u256 |
 *   messageSender bytes32 | maxFee u256 | feeExecuted u256 | expirationBlock u256 |
 *   hookData (rest)
 */
export interface CctpV2BurnMessage {
  readonly sourceDomain: number;
  readonly destinationDomain: number;
  /** 0x-prefixed bytes32. */
  readonly destinationCaller: `0x${string}`;
  /** 0x-prefixed bytes32. */
  readonly mintRecipient: `0x${string}`;
  /** Who burned on the source chain, as a 0x-prefixed 20-byte EVM address (inbound transfers come from EVM chains). */
  readonly messageSender: `0x${string}`;
  /** Burned amount in the source chain's smallest unit (6 decimals for USDC). */
  readonly amount: bigint;
  /** Fee Circle kept on a fast transfer, same unit as `amount`; 0 for standard transfers. */
  readonly feeExecuted: bigint;
  /** 0x-prefixed. */
  readonly hookData: `0x${string}`;
}

const HEADER_BYTES = 148;
const BODY_FIXED_BYTES = 4 + 32 * 7;

function slice(hex: string, byteOffset: number, byteLength: number): string {
  return hex.slice(byteOffset * 2, (byteOffset + byteLength) * 2);
}

export function decodeCctpV2BurnMessage(messageHex: string): CctpV2BurnMessage {
  const hex = messageHex.replace(/^0x/, "").toLowerCase();

  if (!/^[0-9a-f]*$/.test(hex) || hex.length < (HEADER_BYTES + BODY_FIXED_BYTES) * 2) {
    throw new Error("Not a CCTP v2 burn message");
  }

  const body = HEADER_BYTES;

  return {
    sourceDomain: Number.parseInt(slice(hex, 4, 4), 16),
    destinationDomain: Number.parseInt(slice(hex, 8, 4), 16),
    destinationCaller: `0x${slice(hex, 108, 32)}`,
    mintRecipient: `0x${slice(hex, body + 36, 32)}`,
    amount: BigInt(`0x${slice(hex, body + 68, 32)}`),
    messageSender: `0x${slice(hex, body + 100 + 12, 20)}`,
    feeExecuted: BigInt(`0x${slice(hex, body + 164, 32)}`),
    hookData: `0x${hex.slice((body + BODY_FIXED_BYTES) * 2)}`,
  };
}

/**
 * Reads the Stellar address out of CctpForwarder hook data (24 zero bytes, u32 version
 * 0, u32 byte length, then the strkey as UTF-8 - the inverse of
 * services/api/cctp/cctp-stellar-contract.ts#buildCctpForwarderHookData). Returns
 * `undefined` for anything that doesn't match that layout.
 */
export function parseForwarderHookData(hookDataHex: string): string | undefined {
  const hex = hookDataHex.replace(/^0x/, "").toLowerCase();

  if (hex.length < 64 || slice(hex, 0, 28) !== "00".repeat(28)) {
    return undefined;
  }

  const length = Number.parseInt(slice(hex, 28, 4), 16);
  const strkeyHex = slice(hex, 32, length);

  if (strkeyHex.length !== length * 2) {
    return undefined;
  }

  let strkey = "";

  for (let i = 0; i < strkeyHex.length; i += 2) {
    strkey += String.fromCharCode(Number.parseInt(strkeyHex.slice(i, i + 2), 16));
  }

  return /^[A-Z2-7]+$/.test(strkey) ? strkey : undefined;
}
