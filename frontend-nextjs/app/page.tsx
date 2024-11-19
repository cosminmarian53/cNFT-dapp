/* eslint-disable no-console */

"use client";

import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { web3AuthConfig, authAdapterConfig } from "./config/web3auth";
import EthereumRPC from "./RPC/ethRPC-web3"; // for using web3.js
import SolanaRPC from "./RPC/solanaRPC"; // for using solana
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import {
  createTree,
  fetchMerkleTree,
  fetchTreeConfigFromSeeds,
  findLeafAssetIdPda,
  getAssetWithProof,
  LeafSchema,
  mintToCollectionV1,
  mintV1,
  mplBubblegum,
  parseLeafFromMintToCollectionV1Transaction,
  parseLeafFromMintV1Transaction,
  verifyCollection,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  MetadataArgsArgs,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  none,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { getED25519Key } from "@web3auth/auth-adapter";
import { Keypair } from "@solana/web3.js";

let bs58 = require("bs58");

function Page() {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(false);
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const web3auth = new Web3AuthNoModal(web3AuthConfig);
        setWeb3auth(web3auth);

        const authAdapter = new AuthAdapter(authAdapterConfig);
        web3auth.configureAdapter(authAdapter);

        await web3auth.init();

        setProvider(web3auth.provider);
        if (web3auth.connected) {
          setLoggedIn(true);
          const ethRPC = new EthereumRPC(web3auth.provider!);
          const privateKey = await ethRPC.getPrivateKey();
          setPrivateKey(privateKey);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const createCnft = async () => {
    try {
      console.log("Starting createCnft function...");
      if (!provider) {
        console.error("Provider not initialized yet");
        return;
      }

      console.log("Deriving Solana keypair...");
      // Derive Solana keypair
      const ethRPC = new EthereumRPC(provider);
      const ethPrivateKey = await ethRPC.getPrivateKey();
      const endpoint = "https://api.devnet.solana.com";
      const ed25519Key = getED25519Key(ethPrivateKey).sk;

      console.log("Initializing UMI...");
      // Initialize UMI
      const umi = createUmi(endpoint)
        .use(dasApi())
        .use(mplBubblegum())
        .use(mplTokenMetadata())
        .use(irysUploader({ address: "https://devnet.irys.xyz" }));
      const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(ed25519Key));
      let keypair = umi.eddsa.createKeypairFromSecretKey(
        new Uint8Array(solanaKeypair.secretKey)
      );
      const wallet = createSignerFromKeypair(umi, keypair);
      umi.use(keypairIdentity(wallet));

      console.log("Creating Merkle Tree...");
      // Step 1: Create Merkle Tree
      const merkleTree = generateSigner(umi);
      console.log(
        "Merkle Tree Public Key:",
        merkleTree.publicKey.toString(),
        "\nStore this address as you will need it later."
      );
      uiConsole("Merkle Tree Public Key:", merkleTree.publicKey.toString());
      console.log("Creating Merkle Tree...");
      uiConsole("Creating Merkle Tree...");
      const createTreeTx = await createTree(umi, {
        merkleTree,
        maxDepth: 3,
        maxBufferSize: 8,
        canopyDepth: 0,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      });

      console.log("Sending request to create Merkle Tree...");
      const { blockhash, lastValidBlockHeight } =
        await umi.rpc.getLatestBlockhash();
      await createTreeTx.sendAndConfirm(umi, {
        send: { commitment: "finalized" },
        confirm: {
          strategy: { type: "blockhash", blockhash, lastValidBlockHeight },
        },
      });

      console.log("Waiting for Merkle Tree to be created...");
      let treeFound = false;
      while (!treeFound) {
        try {
          const treeConfig = await fetchTreeConfigFromSeeds(umi, {
            merkleTree: merkleTree.publicKey,
          });
          treeFound = true;
          console.log(
            `🌲 Merkle Tree created: ${merkleTree.publicKey.toString()}. Config:`
          );
          console.log(
            `     - Total Mint Capacity ${Number(
              treeConfig.totalMintCapacity
            ).toLocaleString()}`
          );
          console.log(
            `     - Number Minted: ${Number(
              treeConfig.numMinted
            ).toLocaleString()}`
          );
          console.log(`     - Is Public: ${treeConfig.isPublic}`);
          console.log(
            `     - Is Decompressible: ${treeConfig.isDecompressible}`
          );
        } catch (error) {
          console.log("Merkle Tree not found yet, retrying in 5 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      console.log("Uploading cNFT metadata...");
      //** Upload Image and Metadata used for the NFT (Optional) **
      const nftMetadata: MetadataArgsArgs = {
        name: "Cyber-Spliced Alien 3000",
        symbol: "CSA3K",
        uri: "https://raw.githubusercontent.com/cosminmarian53/Data-for-nfts/refs/heads/main/cyberalien.json",
        sellerFeeBasisPoints: 500,
        collection: none(),
        creators: [],
      };

      console.log("Minting Compressed NFT to Merkle Tree...");
      // Step 5: Mint NFT
      const leafOwner = publicKey(solanaKeypair.publicKey.toString());
      const { signature } = await mintV1(umi, {
        leafOwner,
        merkleTree: merkleTree.publicKey,
        metadata: nftMetadata,
      }).sendAndConfirm(umi);

      console.log("Fetching asset ID...");
      //Fetching asset ID
      const leaf = await parseLeafFromMintV1Transaction(umi, signature);
      const assetId = findLeafAssetIdPda(umi, {
        merkleTree: merkleTree.publicKey,
        leafIndex: leaf.nonce,
      });
      console.log(`🍃 NFT Minted: ${assetId[0].toString()}`);
      console.log("Fetching the asset...");
      // Fetch the asset
      // Fetch the asset using umi rpc with DAS.
      const asset = await umi.rpc.getAsset(assetId[0]);
      console.log("Compressed NFT Asset ID:", assetId.toString());

      console.log({ asset });
      // Fetch the asset with proof
      const rpcAssetProof = await umi.rpc.getAssetProof(publicKey(assetId));
      console.log(rpcAssetProof);
      // Display the asset ID and Solana Explorer link
      uiConsole(
        "🍃NFT Minted, paste this into solana explorer:",
        assetId[0].toString()
      );
    } catch (error) {
      console.error("Error creating cNFT:", error);
      uiConsole("Error creating cNFT:", error);
    }
  };
  const getAllAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    // EVM chains

    const rpcETH = new EthereumRPC(provider!);
    const privateKey = await rpcETH.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);

    const solana_address = await solanaRPC.getAccounts();
    const eth_address = await rpcETH.getAccounts();

    uiConsole(
      "Solana Address: " + solana_address,
      "Ethereum Address: " + eth_address
    );
  };

  const getAllBalances = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    const ethRPC = new EthereumRPC(provider!);
    const privateKey = await ethRPC.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);

    const eth_balance = await ethRPC.getBalance();
    const solana_balance = await solanaRPC.getBalance();

    uiConsole(
      "Ethereum Balance: " + eth_balance,
      "Solana Balance: " + solana_balance
    );
  };

  const login = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
      loginProvider: "google",
    });
    setProvider(web3authProvider);
    setLoggedIn(true);
    uiConsole("Logged in Successfully!");
  };

  const authenticateUser = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    uiConsole(idToken);
  };

  const logout = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
    setLoggedIn(false);
  };

  const getEthAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new EthereumRPC(provider);
    const address = await rpc.getAccounts();
    uiConsole("ETH Address: " + address);
  };

  const getSolanaAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const ethRPC = new EthereumRPC(provider!);
    const privateKey = await ethRPC.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);
    const address = await solanaRPC.getAccounts();
    uiConsole("Solana Address: " + address);
  };

  const getEthBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    const rpc = new EthereumRPC(provider);
    const balance = await rpc.getBalance();
    const finalString = "ETH Balance: " + balance;
    uiConsole(finalString);
  };

  const getSolanaBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    const ethRPC = new EthereumRPC(provider!);
    const privateKey = await ethRPC.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);
    const balance = await solanaRPC.getBalance();
    const finalString = "SOL Balance: " + balance;
    uiConsole(finalString);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new EthereumRPC(provider);
    const receipt = await rpc.sendTransaction();
    uiConsole(receipt);
  };

  const sendSolanaTransaction = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    const ethRPC = new EthereumRPC(provider!);
    const privateKey = await ethRPC.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);
    const receipt = await solanaRPC.sendTransaction();
    uiConsole(receipt);
  };

  const signEthereumMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new EthereumRPC(provider);
    const signedMessage = await rpc.signMessage();
    uiConsole(signedMessage);
  };

  const signSolanaMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }

    const ethRPC = new EthereumRPC(provider!);
    const privateKey = await ethRPC.getPrivateKey();

    const solanaRPC = new SolanaRPC(privateKey);
    const signedMessage = await solanaRPC.signMessage();
    uiConsole(signedMessage);
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const loggedInView = (
    <>
      <div className="flex flex-col items-center">
        <div className="space-x-4 mb-4">
          <button
            onClick={logout}
            className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
          >
            Log Out
          </button>
        </div>
        <div className="flex space-x-4">
          <div className="card bg-white shadow-md rounded-lg flex flex-col items-center p-6">
            <h2 className="text-xl font-bold mb-2">Ethereum</h2>
            <button
              onClick={getEthAccounts}
              className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
            >
              Get ETH Account
            </button>
            <button
              onClick={getEthBalance}
              className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
            >
              Get ETH Balance
            </button>
            <button
              onClick={signEthereumMessage}
              className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
            >
              Sign Ethereum Message
            </button>
            <button
              onClick={sendTransaction}
              className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
            >
              Send Ethereum Transaction
            </button>
          </div>
          <div className="card bg-white shadow-md rounded-lg flex flex-col items-center p-6">
            <h2 className="text-xl font-bold mb-2">Solana</h2>
            <button
              onClick={getSolanaAccounts}
              className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
            >
              Get SOL Account
            </button>
            <button
              onClick={getSolanaBalance}
              className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
            >
              Get SOL Balance
            </button>
            <button
              onClick={sendSolanaTransaction}
              className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
            >
              Send Solana Transaction
            </button>
            <button
              onClick={signSolanaMessage}
              className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
            >
              Sign Solana Message
            </button>
          </div>
        </div>
        <div className="flex space-x-4 mt-4">
          <button
            onClick={getAllAccounts}
            className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
          >
            Get All Accounts
          </button>
          <button
            onClick={getAllBalances}
            className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
          >
            Get All Balances
          </button>
          <button
            onClick={createCnft}
            className="btn hover:bg-green-400 p-1 rounded-md transition-colors"
          >
            Mint Compressed NFT
          </button>
        </div>
      </div>
      <div id="console" className="mt-4 p-4 bg-gray-100 rounded-lg shadow-md">
        <p className="whitespace-pre-line"></p>
      </div>
    </>
  );

  const unloggedInView = (
    <div className="flex space-x-4">
      <button
        onClick={login}
        className="btn hover:bg-blue-400 p-1 rounded-md transition-colors"
      >
        Login
      </button>
    </div>
  );

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-8">
      <h1 className="text-4xl font-bold mb-8">XNFTify</h1>

      <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>

      <footer className="mt-8 text-gray-500">Made with ❤️</footer>
    </div>
  );
}

export default Page;
