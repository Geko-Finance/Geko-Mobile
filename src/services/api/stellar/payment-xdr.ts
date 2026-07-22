import {
  Account,
  Asset,
  BASE_FEE,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";

export function buildNativePaymentXdr(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  destinationPublicKey: string;
  amountXlm: string;
  networkPassphrase: string;
  asset?: { code: string; issuer: string };
  memo?: string;
}): string {
  const account = new Account(params.sourcePublicKey, params.sourceSequence);

  let builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: params.networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination: params.destinationPublicKey,
      asset:
        params.asset === undefined
          ? Asset.native()
          : new Asset(params.asset.code, params.asset.issuer),
      amount: params.amountXlm,
    }),
  );

  if (params.memo) {
    builder = builder.addMemo(Memo.text(params.memo));
  }

  return builder.setTimeout(30).build().toXDR();
}
