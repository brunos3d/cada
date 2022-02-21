import ccli from '../services/cardano-cli';

export default function queryTip() {
  return ccli.queryTip();
}
