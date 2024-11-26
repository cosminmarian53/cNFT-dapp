import {
  ChainAddress,
  ChainContext,
  Network,
  Signer,
  Wormhole,
  Chain,
  TokenId,
  isTokenId,
} from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import BnbRPC from "../RPC/bnbRPC-web3";
import SolanaRPC from "../RPC/solanaRPC";
import { IProvider } from "@web3auth/base";
import { getED25519Key } from "@web3auth/auth-adapter";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "dotenv";
config();

export interface SignerStuff<N extends Network, C extends Chain> {
  chain: ChainContext<N, C>;
  signer: Signer<N, C>;
  address: ChainAddress<C>;
}

// Signer setup function for different blockchain platforms
export async function getSigner<N extends Network, C extends Chain>(
  chain: ChainContext<N, C>,
  provider: IProvider
): Promise<{
  chain: ChainContext<N, C>;
  signer: Signer<N, C>;
  address: ChainAddress<C>;
}> {
  let signer: Signer;
  const platform = chain.platform.utils()._platform;
  const bnbRPC = new BnbRPC(provider);
  const bnbPrivateKey = await bnbRPC.getPrivateKey();
  switch (platform) {
    case "Solana":
      const ed25519Key = getED25519Key(bnbPrivateKey).sk;
      const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(ed25519Key));
      signer = await (
        await solana()
      ).getSigner(await chain.getRpc(), bs58.encode(solanaKeypair.secretKey));
      break;
    case "Evm":
      signer = await (
        await evm()
      ).getSigner(await chain.getRpc(), bnbPrivateKey);
      break;
    default:
      throw new Error("Unsupported platform: " + platform);
  }

  return {
    chain,
    signer: signer as Signer<N, C>,
    address: Wormhole.chainAddress(chain.chain, signer.address()),
  };
}

export async function getTokenDecimals<
  N extends "Mainnet" | "Testnet" | "Devnet"
>(
  wh: Wormhole<N>,
  token: TokenId,
  sendChain: ChainContext<N, any>
): Promise<number> {
  return isTokenId(token)
    ? Number(await wh.getDecimals(token.chain, token.address))
    : sendChain.config.nativeTokenDecimals;
}
