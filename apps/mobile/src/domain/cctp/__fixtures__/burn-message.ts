/** Test-only builder for CCTP v2 burn messages (see domain/cctp/message.ts for the layout). */
const u32 = (n: number) => n.toString(16).padStart(8, "0");
const u256 = (n: bigint) => n.toString(16).padStart(64, "0");
const word = (byte: string) => byte.repeat(32);

export const TESTNET_FORWARDER_BYTES32 =
  "3de86ac50b47eaf2840fe23e48179551660fd1072fba6f445d4a6bd7af4ab93e";

export function forwarderHookDataHex(strkey: string): string {
  const utf8 = Array.from(strkey, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");

  return `${"00".repeat(24)}${u32(0)}${u32(strkey.length)}${utf8}`;
}

export function buildBurnMessage(opts: {
  readonly amount: bigint;
  readonly feeExecuted?: bigint;
  readonly destinationDomain?: number;
  readonly forwarder?: string;
  readonly hookData: string;
}): `0x${string}` {
  const forwarder = opts.forwarder ?? TESTNET_FORWARDER_BYTES32;
  const header =
    u32(1) + u32(0) + u32(opts.destinationDomain ?? 27) +
    word("11") + word("22") + word("33") + forwarder + u32(2000) + u32(2000);
  const body =
    u32(1) + word("44") + forwarder + u256(opts.amount) + word("55") +
    u256(0n) + u256(opts.feeExecuted ?? 0n) + u256(0n) + opts.hookData;

  return `0x${header}${body}`;
}
