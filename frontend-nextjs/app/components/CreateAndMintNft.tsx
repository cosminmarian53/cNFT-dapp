import React, { useState } from "react";
import { IProvider } from "@web3auth/base";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import {
  createTree,
  fetchTreeConfigFromSeeds,
  findLeafAssetIdPda,
  mintV1,
  mplBubblegum,
  parseLeafFromMintV1Transaction,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  MetadataArgsArgs,
} from "@metaplex-foundation/mpl-bubblegum";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  none,
  PublicKey,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { getED25519Key } from "@web3auth/auth-adapter";
import { Keypair } from "@solana/web3.js";
import EthereumRPC from "../RPC/ethRPC-web3";
import bs58 from "bs58";

interface CreateAndMintNftProps {
  provider: IProvider | null;
  uiConsole: (...args: any[]) => void;
}

const CreateAndMintNft: React.FC<CreateAndMintNftProps> = ({
  provider,
  uiConsole,
}) => {
  const [umi, setUmi] = useState<any>(null);
  const [solanaKeypair, setSolanaKeypair] = useState<Keypair | null>(null);
  const [merkleTree, setMerkleTree] = useState<PublicKey | null>(null);

  const initializeUmi = async () => {
    try {
      console.log("Initializing UMI...");
      uiConsole("Initializing UMI...");
      if (!provider) {
        console.error("Provider not initialized yet");
        return;
      }

      const ethRPC = new EthereumRPC(provider);
      const ethPrivateKey = await ethRPC.getPrivateKey();
      const endpoint = "https://api.devnet.solana.com";
      const ed25519Key = getED25519Key(ethPrivateKey).sk;

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

      setUmi(umi);
      setSolanaKeypair(solanaKeypair);
      console.log("UMI initialized and Solana keypair derived.");
      uiConsole("UMI initialized and Solana keypair derived.");
    } catch (error) {
      console.error("Error initializing UMI:", error);
    }
  };

  const createMerkleTree = async () => {
    try {
      if (!umi) {
        console.error("UMI not initialized yet");
        return;
      }

      console.log("Creating Merkle Tree...");
      uiConsole("Creating Merkle Tree...");
      const merkleTree = generateSigner(umi);
      console.log(`Creating Merkle Tree: ${merkleTree.publicKey.toString()}`);
      uiConsole("Creating Merkle Tree:", merkleTree.publicKey.toString());
      const builder = await createTree(umi, {
        merkleTree,
        maxDepth: 20,
        maxBufferSize: 64,
        canopyDepth: 14,
      });
      console.log("Sending request (this may take a few moments)...");
      uiConsole("Sending request (this may take a few moments)...");
      const { blockhash, lastValidBlockHeight } =
        await umi.rpc.getLatestBlockhash();
      await builder.sendAndConfirm(umi, {
        send: { commitment: "finalized" },
        confirm: {
          strategy: { type: "blockhash", blockhash, lastValidBlockHeight },
        },
      });

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
          uiConsole("🌲 Merkle Tree created:", merkleTree.publicKey.toString());
          console.log(
            ` -Total Mint Capacity: ${Number(
              treeConfig.totalMintCapacity
            ).toLocaleString()}`
          );
          uiConsole(" -Total Mint Capacity:", treeConfig.totalMintCapacity);
          console.log(
            `Number Minted: ${Number(treeConfig.numMinted).toLocaleString()}`
          );
          uiConsole(" -Number Minted:", treeConfig.numMinted);
          console.log(`Is Public: ${treeConfig.isPublic}`);
          uiConsole(" -Is Public:", treeConfig.isPublic);
          console.log(`Is Decompressible: ${treeConfig.isDecompressible}`);
          uiConsole(" -Is Decompressible:", treeConfig.isDecompressible);
        } catch (error) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      setMerkleTree(merkleTree.publicKey);
    } catch (error) {
      console.error("Error creating Merkle Tree:", error);
    }
  };

  const mintCnft = async () => {
    try {
      if (!umi || !solanaKeypair || !merkleTree) {
        console.error(
          "UMI, Solana keypair, or Merkle Tree not initialized yet"
        );
        return;
      }

      console.log("Uploading NFT metadata...");
      uiConsole("Uploading NFT metadata...");
      const nftMetadata: MetadataArgsArgs = {
        name: "Cyber-Spliced Alien 3000",
        symbol: "CSA3K",
        uri: "https://raw.githubusercontent.com/cosminmarian53/Data-for-nfts/refs/heads/main/cyberalien.json",
        sellerFeeBasisPoints: 500,
        collection: none(),
        creators: [],
      };

      console.log("Minting Compressed NFT to Merkle Tree...");
      uiConsole("Minting Compressed NFT to Merkle Tree...");
      const leafOwner = generateSigner(umi).publicKey;
      const { signature } = await mintV1(umi, {
        leafOwner,
        merkleTree,
        metadata: nftMetadata,
      }).sendAndConfirm(umi);

      console.log("Finding Asset ID...");
      uiConsole("Finding Asset ID...");
      const leaf = await parseLeafFromMintV1Transaction(umi, signature);
      const assetId = findLeafAssetIdPda(umi, {
        merkleTree,
        leafIndex: leaf.nonce,
      });
      console.log(`🍃 NFT Minted: ${assetId[0].toString()}`);

      // Fetch the asset
      console.log("Fetching the asset...");
      const asset = await umi.rpc.getAsset(assetId[0]);
      console.log("Compressed NFT Asset ID:", assetId.toString());
      console.log({ asset });

      // Fetch the asset with proof
      console.log("Fetching the asset with proof...");
      const rpcAssetProof = await umi.rpc.getAssetProof(publicKey(assetId));
      console.log(rpcAssetProof);

      // Display the asset ID and Solana Explorer link
      uiConsole(
        "🍃NFT Successfully Minted! Paste the following asset ID into Solana Explorer:",
        assetId[0].toString()
      );
    } catch (error) {
      console.error("Error minting cNFT:", error);
      uiConsole("Error minting cNFT:", error);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={initializeUmi}
        className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
      >
        Initialize UMI
      </button>
      <button
        onClick={createMerkleTree}
        className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
      >
        Create Merkle Tree
      </button>
      <button
        onClick={mintCnft}
        className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
      >
        Mint cNFT
      </button>
    </div>
  );
};

export default CreateAndMintNft;
