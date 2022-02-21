import swr from '../services/swr';
import ccli from '../services/cardano-cli';

import { toLovelace } from '../helpers/utils';

export default async function sendOneToMany(senderAccount: string, receiverAddresses: string[], amount: number) {
  const transferAmountLovelace = toLovelace(amount);

  const senderWallet = await ccli.wallet(senderAccount);
  const senderCachedUtxos = await swr(senderWallet.paymentAddr, async () => await senderWallet.balance());

  // create raw transaction
  const txInfo = {
    txIn: senderCachedUtxos.utxo,
    // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
    txOut: [
      // value going back to senderWallet
      {
        address: senderWallet.paymentAddr,
        value: {
          lovelace: senderCachedUtxos.value.lovelace - transferAmountLovelace * receiverAddresses.length,
        },
      },
      // value going to receivers
      ...receiverAddresses.map((receiverAddress) => ({
        address: receiverAddress,
        value: {
          lovelace: transferAmountLovelace,
        },
      })),
    ],
  };

  const raw = await ccli.transactionBuildRaw(txInfo);

  // calculate fee
  const fee = await ccli.transactionCalculateMinFee({
    ...txInfo,
    txBody: raw,
    witnessCount: 1,
  });

  // pay the fee by subtracting it from the senderWallet utxo
  txInfo.txOut[0].value.lovelace -= fee;

  // create final transaction
  const tx = await ccli.transactionBuildRaw({ ...txInfo, fee });

  // sign the transaction
  const txSigned = await ccli.transactionSign({
    txBody: tx,
    signingKeys: [senderWallet.payment.skey],
  });

  // broadcast transaction
  return ccli.transactionSubmit(txSigned);
}
