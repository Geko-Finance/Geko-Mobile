import {
  Account,
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";

export function buildChangeTrustXdr(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  code: string;
  issuer: string;
  networkPassphrase: string;
}): string {
  const account = new Account(params.sourcePublicKey, params.sourceSequence);

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: params.networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(params.code, params.issuer),
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();
}
