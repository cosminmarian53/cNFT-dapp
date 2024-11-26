import {
  CHAIN_NAMESPACES,
  WEB3AUTH_NETWORK,
  UX_MODE,
  Web3AuthNoModalOptions,
} from "@web3auth/base";
import { AuthAdapterOptions } from "@web3auth/auth-adapter";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

const clientId =
  "BGEzPrauva6gn6Za9xrpCsDyMceuMPyvp29byYpr4WlI9GYG13oRn9O8rFJ8C0VkjsdmId8SDzS8ZB6zJYgZjmI"; // get from https://dashboard.web3auth.io

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x61", // hex of 97
  rpcTarget: "https://rpc.ankr.com/bsc_testnet_chapel",
  // Avoid using public rpcTarget in production.
  // Use services like Infura, Quicknode etc
  displayName: "Binance SmartChain Testnet",
  blockExplorerUrl: "https://testnet.bscscan.com",
  ticker: "BNB",
  tickerName: "BNB",
  logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
};
const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

export const web3AuthConfig: Web3AuthNoModalOptions = {
  clientId,
  privateKeyProvider,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
};

export const authAdapterConfig: AuthAdapterOptions = {
  adapterSettings: {
    uxMode: UX_MODE.REDIRECT,
  },
};
