import type { TransactionBuildRaw, TxOut } from 'cardano-cli-async/lib/models/cardano';

import swr from '../services/swr';
import ccli from '../services/cardano-cli';

export default async function sendManyToOne(
  senderAccounts: string[],
  receiverAddress: string,
  { amount, fullBalance }: { amount?: number; fullBalance?: boolean }
) {
  const senderWallets = await Promise.all(senderAccounts.map((senderAccount) => ccli.wallet(senderAccount)));
  const senderCachedBalances = await Promise.all(
    senderWallets.map((senderWallet) => swr(senderWallet.paymentAddr, async () => await senderWallet.balance()))
  );
  const senderCachedUtxos = senderCachedBalances.map((balance) => balance.utxo).flat();

  let txInfo: TransactionBuildRaw;

  if (fullBalance) {
    const txOutValue: Record<string, number> = {};

    senderCachedUtxos.forEach((utxo) => {
      Object.entries(utxo.value).forEach(([key, value]) => {
        txOutValue[key] = (txOutValue[key] ?? 0) + (value as number);
      });
    });

    txInfo = {
      txIn: senderCachedUtxos,
      // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
      txOut: [
        // value going to receiver
        {
          address: receiverAddress,
          value: txOutValue,
        } as TxOut,
      ],
    };
  } else {
    return console.log('Custom balance not implemented yet');
    // const transferAmountLovelace = ccli.toLovelace(amount);

    // const sendersTxOut = senderCachedUtxos.map((utxo) => ({
    //   address: senderWallet.paymentAddr,
    //   value: {
    //     lovelace: utxo.value.lovelace - transferAmountLovelace,
    //   },
    // }));

    // // create raw transaction
    // txInfo = {
    //   txIn: senderCachedUtxos,
    //   // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
    //   txOut: [
    //     // value going back to senderWallet
    //     {
    //       address: senderWallet.paymentAddr,
    //       value: {
    //         lovelace: senderCachedUtxos.value.lovelace - transferAmountLovelace,
    //       },
    //     },
    //     // value going to receiver
    //     {
    //       address: receiverAddress,
    //       value: {
    //         lovelace: transferAmountLovelace,
    //       },
    //     },
    //   ],
    // };
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
  const txSigned = ccli.transactionSign({
    txBody: tx,
    signingKeys: senderWallets.map((senderWallet) => senderWallet.payment.skey),
  });

  // broadcast transaction
  return ccli.transactionSubmit(txSigned);
}
