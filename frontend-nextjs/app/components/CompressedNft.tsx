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
  MetadataArgsArgs,
  getAssetWithProof,
  redeem,
  findVoucherPda,
  decompressV1,
  cancelRedeem,
  TreeConfig,
  setDecompressibleState,
  DecompressibleState,
} from "@metaplex-foundation/mpl-bubblegum";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  none,
  PublicKey,
  publicKey,
  Pda,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { getED25519Key } from "@web3auth/auth-adapter";
import { Keypair } from "@solana/web3.js";
import BnBRPC from "../RPC/bnbRPC-web3";
import WormholeBrige from "./WormholeBridge";
import bs58 from "bs58";
interface CompressedNftProps {
  provider: IProvider | null;
  uiConsole: (...args: any[]) => void;
}

const CompressedNft: React.FC<CompressedNftProps> = ({
  provider,
  uiConsole,
}) => {
  const [umi, setUmi] = useState<any>(null);
  const [solanaKeypair, setSolanaKeypair] = useState<Keypair | null>(null);
  const [merkleTree, setMerkleTree] = useState<PublicKey | null>(null);
  const [assetId, setAssetId] = useState<PublicKey | null>(null);
  const [voucher, setVoucher] = useState<Pda | null>(null);

  const initializeUmi = async () => {
    try {
      console.log("Initializing UMI...");
      uiConsole("Initializing UMI...");
      if (!provider) {
        console.error("Provider not initialized yet");
        return;
      }

      const bnbRPC = new BnBRPC(provider);
      const bnbPrivateKey = await bnbRPC.getPrivateKey();
      const endpoint = "https://api.devnet.solana.com";
      const ed25519Key = getED25519Key(bnbPrivateKey).sk;

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
          const config = await fetchTreeConfigFromSeeds(umi, {
            merkleTree: merkleTree.publicKey,
          });
          await setDecompressibleState(umi, {
            treeConfig: config.publicKey,
            decompressableState: DecompressibleState.Enabled,
          }).sendAndConfirm(umi);
          console.log(
            `🌲 Merkle Tree created: ${merkleTree.publicKey.toString()}. Config:`
          );
          uiConsole("🌲 Merkle Tree created:", merkleTree.publicKey.toString());
          console.log(
            ` -Total Mint Capacity: ${Number(
              config.totalMintCapacity
            ).toLocaleString()}`
          );
          console.log(
            `Number Minted: ${Number(config.numMinted).toLocaleString()}`
          );
          console.log(`Is Public: ${config.isPublic}`);
          console.log(`Is Decompressible: ${config.isDecompressible}`);
          treeFound = true;
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
      const leafOwner = solanaKeypair; // Use solanaKeypair as leafOwner
      const { signature } = await mintV1(umi, {
        leafOwner: leafOwner.publicKey,
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
      setAssetId(assetId[0]);

      // Fetch the asset
      console.log("Fetching the asset...");
      const asset = await umi.rpc.getAsset(assetId[0]);
      console.log("Compressed NFT Asset ID:", assetId[0].toString());
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

  const redeemNft = async () => {
    try {
      if (!umi || !assetId || !solanaKeypair) {
        console.error("UMI, assetId, or Solana keypair not initialized yet");
        return;
      }
      console.log("Redeeming Compressed NFT...");
      const assetWithProof = await getAssetWithProof(umi, assetId, {
        truncateCanopy: true,
      });
      await redeem(umi, {
        ...assetWithProof,
        leafOwner: solanaKeypair.publicKey,
      }).sendAndConfirm(umi);
      const voucherPda = findVoucherPda(umi, assetWithProof);
      setVoucher(voucherPda);
      uiConsole("Redeemed Compressed NFT. Voucher PDA:", voucherPda.toString());
    } catch (error) {
      console.error("Error redeeming Compressed NFT:", error);
      uiConsole("Error redeeming Compressed NFT:", error);
    }
  };

  const decompressNft = async () => {
    try {
      if (!umi || !assetId || !solanaKeypair || !voucher) {
        console.error(
          "UMI, assetId, Solana keypair, or voucher not initialized yet"
        );
        return;
      }
      console.log("Decompressing Redeemed NFT...");
      const assetWithProof = await getAssetWithProof(umi, assetId, {
        truncateCanopy: true,
      });
      await decompressV1(umi, {
        ...assetWithProof,
        leafOwner: solanaKeypair.publicKey,
        mint: assetId,
        voucher: voucher,
      }).sendAndConfirm(umi);
      uiConsole("Decompressed NFT successfully. Here is the ID:", assetId);
    } catch (error) {
      console.error("Error decompressing NFT:", error);
      uiConsole("Error decompressing NFT:", error);
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
      <button
        onClick={redeemNft}
        className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
      >
        Redeem NFT
      </button>
      <button
        onClick={decompressNft}
        className="btn hover:bg-purple-500 p-1 rounded-md transition-colors"
      >
        Decompress NFT
      </button>
      <WormholeBrige
        provider={provider}
        assetId={assetId}
        uiConsole={uiConsole}
        solanaKeypair={solanaKeypair}
      />
    </div>
  );
};

export default CompressedNft;
