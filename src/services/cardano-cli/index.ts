import CardanoCLI from 'cardano-cli-async';

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/${process.env.CARDANO_NODE_NETWORK}-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPath: `${process.env.APP_CLI_PREFIX} ${process.env.APP_CLI_COMMAND_PATH}`,
  network: process.env.CARDANO_NODE_NETWORK,
  dir: process.env.CARDANO_NODE_NETWORK === 'mainnet' ? `./data` : `./data-testnet`,
});

export default ccli;
