import { describe, expect, it } from "@jest/globals";

import realMintRecord from "../__fixtures__/horizon-cctp-mint-and-forward.json";
import { mapPaymentRecord } from "../stellar-history";

const ME = "GCK72LMNTMMC4ZHX27II3E3N7PHSO3JWMXP336CZ6OOTYC6ST5IE4IQS";
const FORWARDER = "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// Trimmed from Horizon's /payments response for a real CCTP mint_and_forward
// (testnet tx 75cd2bf3...83dc): USDC reaches the account through a contract call,
// visible only in asset_balance_changes.
const cctpMintRecord = {
  id: "20722255130566657",
  type: "invoke_host_function",
  type_i: 24,
  created_at: "2026-09-23T07:11:07Z",
  transaction_hash: "75cd2bf30a4e2e88e8151d233bc1ba14d64596ab92e441e9ae66773c752883dc",
  source_account: ME,
  asset_balance_changes: [
    {
      asset_type: "credit_alphanum12",
      asset_code: "USDCALLCCTP",
      asset_issuer: "GBKCGIEERYEW2XE3KWVI3AS2NZD3HWJWF5LI7HIYZ4KMCULPS4GXQLVZ",
      type: "burn",
      from: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
      amount: "1.0000000",
    },
    {
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: USDC_ISSUER,
      type: "mint",
      to: FORWARDER,
      amount: "1.0000000",
    },
    {
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: USDC_ISSUER,
      type: "transfer",
      from: FORWARDER,
      to: ME,
      amount: "1.0000000",
    },
  ],
};

describe("mapPaymentRecord", () => {
  it("names the EVM wallet that sent a CCTP transfer, and the network it came from", () => {
    expect(mapPaymentRecord(realMintRecord, ME)).toMatchObject({
      type: "received",
      counterparty: "0x5c76d192dc94fe3b75cc9bd5deb4287856250361",
      originChainId: "ethereum",
      amount: "1.0000000",
      assetCode: "USDC",
    });
  });

  it("shows USDC delivered by a contract call (e.g. a CCTP mint) as received", () => {
    expect(mapPaymentRecord(cctpMintRecord, ME)).toEqual({
      id: "20722255130566657",
      type: "received",
      counterparty: FORWARDER,
      amount: "1.0000000",
      assetCode: "USDC",
      createdAt: "2026-09-23T07:11:07Z",
      hash: "75cd2bf30a4e2e88e8151d233bc1ba14d64596ab92e441e9ae66773c752883dc",
    });
  });

  it("shows funds a contract call takes from the account as sent", () => {
    const record = {
      ...cctpMintRecord,
      asset_balance_changes: [
        { asset_type: "native", type: "transfer", from: ME, to: FORWARDER, amount: "5.0000000" },
      ],
    };

    expect(mapPaymentRecord(record, ME)).toMatchObject({
      type: "sent",
      counterparty: FORWARDER,
      amount: "5.0000000",
      assetCode: "XLM",
    });
  });

  it("ignores contract calls that don't move this account's funds", () => {
    const record = { ...cctpMintRecord, asset_balance_changes: cctpMintRecord.asset_balance_changes.slice(0, 2) };

    expect(mapPaymentRecord(record, ME)).toBeNull();
  });

  it("keeps issued-asset payments, labelled with their asset code", () => {
    const record = {
      id: "1",
      type: "payment",
      type_i: 1,
      created_at: "2026-09-23T08:00:00Z",
      transaction_hash: "hash-1",
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: USDC_ISSUER,
      from: ME,
      to: "GOTHER",
      amount: "2.5000000",
    };

    expect(mapPaymentRecord(record, ME)).toMatchObject({
      type: "sent",
      counterparty: "GOTHER",
      amount: "2.5000000",
      assetCode: "USDC",
    });
  });

  it("labels native payments and account funding as XLM", () => {
    expect(
      mapPaymentRecord(
        {
          id: "2",
          type: "create_account",
          type_i: 0,
          created_at: "2026-09-23T06:36:02Z",
          transaction_hash: "hash-2",
          funder: "GFRIENDBOT",
          account: ME,
          starting_balance: "10000.0000000",
        },
        ME
      )
    ).toMatchObject({ type: "received", amount: "10000.0000000", assetCode: "XLM" });
  });
});
