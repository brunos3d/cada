import type { TransactionBuildRaw } from 'cardano-cli-async/lib/models/cardano';

import swr from '../services/swr';
import ccli from '../services/cardano-cli';
import { toLovelace } from '../helpers/utils';

export default async function sendOneToOne(
  senderAccount: string,
  receiverAddress: string,
  { amount, fullBalance }: { amount?: number; fullBalance?: boolean }
) {
  const senderWallet = await ccli.wallet(senderAccount);
  const senderCachedUtxos = await swr(senderWallet.paymentAddr, async () => await senderWallet.balance());

  let txInfo: TransactionBuildRaw;

  if (fullBalance) {
    txInfo = {
      txIn: senderCachedUtxos.utxo,
      // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
      txOut: [
        // value going to receiver
        {
          address: receiverAddress,
          value: {
            lovelace: senderCachedUtxos.value.lovelace,
          },
        },
      ],
    };
  } else if (amount) {
    const transferAmountLovelace = toLovelace(amount);

    // create raw transaction
    txInfo = {
      txIn: senderCachedUtxos.utxo,
      // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
      txOut: [
        // value going back to senderWallet
        {
          address: senderWallet.paymentAddr,
          value: {
            lovelace: senderCachedUtxos.value.lovelace - transferAmountLovelace,
          },
        },
        // value going to receiver
        {
          address: receiverAddress,
          value: {
            lovelace: transferAmountLovelace,
          },
        },
      ],
    };
  } else {
    throw new Error('Amount or fullBalance is required');
  }

  const raw = await ccli.transactionBuildRaw(txInfo);

  // calculate fee
  const fee = await ccli.transactionCalculateMinFee({
    ...txInfo,
    txBody: raw,
    witnessCount: 1,
  });

  // pay the fee by subtracting it from the senderWallet (or receiver if fullBalance option is passed) utxo
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
