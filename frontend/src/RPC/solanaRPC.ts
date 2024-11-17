// Solana
import {
  SolanaPrivateKeyProvider,
  SolanaWallet,
} from "@web3auth/solana-provider";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import IRPC from "./IRPC";
import { getED25519Key } from "@web3auth/auth-adapter";

export default class SolanaRPC implements IRPC {
  private provider: SolanaPrivateKeyProvider;
  private privateKey: string;

  constructor(privateKey: string) {
    this.provider = new SolanaPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId: "0x2",
          rpcTarget: "https://api.devnet.solana.com",
          displayName: "Solana Testnet",
          blockExplorerUrl: "https://explorer.solana.com/",
          ticker: "SOL",
          tickerName: "Solana",
          logo: "https://images.toruswallet.io/solana.svg",
        },
      },
    });
    this.privateKey = privateKey;
  }

  getChainId(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getAccounts(): Promise<any> {
    const ed25519key = getED25519Key(this.privateKey).sk.toString("hex");
    // Get user's Solana's public address
    await this.provider.setupProvider(ed25519key);
    const solanaWallet = new SolanaWallet(
      this.provider as SolanaPrivateKeyProvider
    );
    const solana_address = await solanaWallet.requestAccounts();
    return solana_address[0];
  }

  async getBalance(): Promise<string> {
    const address = await this.getAccounts();

    const connection = new Connection(
      this.provider.config.chainConfig.rpcTarget
    );

    // Fetch the balance for the specified public key
    const balance = await connection.getBalance(new PublicKey(address));

    // Convert the balance from lamports to SOL
    const solBalance = balance / LAMPORTS_PER_SOL;

    return solBalance.toString();
  }

  async sendTransaction(): Promise<any> {
    const ed25519key = getED25519Key(this.privateKey).sk.toString("hex");
    await this.provider.setupProvider(ed25519key);
    const solanaWallet = new SolanaWallet(
      this.provider as SolanaPrivateKeyProvider
    );

    const connectionConfig = await solanaWallet.request<
      string[],
      CustomChainConfig
    >({
      method: "solana_provider_config",
      params: [],
    });

    const connection = new Connection(connectionConfig.rpcTarget);

    const accounts = await solanaWallet.requestAccounts();
    const block = await connection.getLatestBlockhash("finalized");

    const transactionInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(accounts[0]),
      toPubkey: new PublicKey(accounts[0]),
      lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    const transaction = new Transaction({
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight,
      feePayer: new PublicKey(accounts[0]),
    }).add(transactionInstruction);

    const { signature } = await solanaWallet.signAndSendTransaction(
      transaction
    );

    return signature;
  }

  async signMessage(): Promise<any> {
    const ed25519key = getED25519Key(this.privateKey).sk.toString("hex");
    await this.provider.setupProvider(ed25519key);
    const solanaWallet = new SolanaWallet(
      this.provider as SolanaPrivateKeyProvider
    );

    const msg = Buffer.from("Test Signing Message", "utf8");
    const result = await solanaWallet.signMessage(msg);
    return result.toString();
  }

  async getPrivateKey(): Promise<any> {
    const privateKey = await this.provider.request({
      method: "solanaPrivateKey",
    });

    return privateKey;
  }
}