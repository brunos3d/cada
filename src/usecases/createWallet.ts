import ccli from '../services/cardano-cli';

const createWallet = async (account: string) => {
  const payment = await ccli.addressKeyGen(account);
  const stake = await ccli.stakeAddressKeyGen(account);
  ccli.stakeAddressBuild(account);

  await ccli.addressBuild({
    account,
    paymeny_vkey: payment.vkey,
    stake_vkey: stake.vkey,
  });
  return ccli.wallet(account);
};

export default createWallet;
