import { useState } from "react";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { Wormhole } from "@wormhole-foundation/sdk";
import { ethers } from "ethers";
import { NftBurnBridging } from "../index"; // Importing from index.ts
import { IProvider } from "@web3auth/base";
import { publicKey } from "@metaplex-foundation/umi";

interface WormholeBridgeProps {
  provider: IProvider | null;
  uiConsole: (...args: any[]) => void;
  assetId: PublicKey | null;
  solanaKeypair: Keypair | null;
}

const WormholeBridge: React.FC<WormholeBridgeProps> = ({
  provider,
  uiConsole,
  assetId,
  solanaKeypair,
}) => {
  const [loading, setLoading] = useState(false);
  const [bridge, setBridge] = useState<NftBurnBridging | null>(null);
  const [evmRecipient, setEvmRecipient] = useState("");
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize the NftBurnBridging instance
  const initializeBridge = async () => {
    try {
      if (!assetId || !provider) throw new Error("Missing asset or provider");
      const connection = new Connection("https://api.devnet.solana.com"); // Adjust for your cluster
      const programId = new PublicKey(
        "Scaffo1dingNftBurnBridging11111111111111111"
      );
      const wormholeId = new PublicKey(
        "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth"
      );
      const nftBridge = new NftBurnBridging(
        connection,
        assetId,
        programId,
        wormholeId
      );

      setBridge(nftBridge);
      uiConsole("Bridge initialized successfully!");
    } catch (err) {
      console.error(err);
      uiConsole("Error initializing bridge:", err);
    }
  };

  // Check whitelist
  const checkWhitelist = async (nftMint: string) => {
    if (!bridge) {
      uiConsole("Bridge is not initialized!");
      return;
    }

    try {
      const isWhitelisted = await bridge.isNftWhitelisted(publicKey(nftMint));
      uiConsole(`Whitelist status for ${nftMint}: ${isWhitelisted}`);
    } catch (err) {
      console.error(err);
      uiConsole("Error checking whitelist:", err);
    }
  };

  // Send and burn NFT
  const sendAndBurn = async (nftMint: string) => {
    if (!bridge || !solanaKeypair) {
      uiConsole("Bridge or Solana Keypair not initialized!");
      return;
    }

    try {
      const instruction = await bridge.createSendAndBurnInstruction(
        solanaKeypair.publicKey,
        new PublicKey(nftMint),
        evmRecipient
      );

      uiConsole("Send and burn instruction created:", instruction);
    } catch (err) {
      console.error(err);
      uiConsole("Error creating send and burn instruction:", err);
    }
  };

  // Toggle whitelist enablement
  const toggleWhitelist = async () => {
    if (!bridge) {
      uiConsole("Bridge is not initialized!");
      return;
    }

    try {
      const enabled = await bridge.isWhitelistEnabled();
      setWhitelistEnabled(enabled);
      uiConsole(`Whitelist enabled: ${enabled}`);
    } catch (err) {
      console.error(err);
      uiConsole("Error checking whitelist status:", err);
    }
  };

  // Toggle pause state
  const togglePause = async () => {
    if (!bridge) {
      uiConsole("Bridge is not initialized!");
      return;
    }

    try {
      const paused = await bridge.isPaused();
      setIsPaused(paused);
      uiConsole(`Bridge paused state: ${paused}`);
    } catch (err) {
      console.error(err);
      uiConsole("Error checking paused state:", err);
    }
  };

  return (
    <div className="wormhole-bridge flex flex-col">
      <h2 className="text-lg font-semibold text-center mt-2">
        Wormhole Bridge
      </h2>

      <button
        className="btn btn-primary mt-4"
        onClick={initializeBridge}
        disabled={loading}
      >
        Initialize Bridge
      </button>

      <div className="flex flex-col mt-4">
        <label className="text-sm font-semibold">EVM Recipient:</label>
        <input
          type="text"
          className="input input-bordered"
          value={evmRecipient}
          onChange={(e) => setEvmRecipient(e.target.value)}
        />
      </div>

      <button
        className="btn btn-secondary mt-4"
        onClick={() => checkWhitelist("YourNFTMintHere")}
        disabled={!bridge || loading}
      >
        Check Whitelist
      </button>

      <button
        className="btn btn-secondary mt-4"
        onClick={() => sendAndBurn("YourNFTMintHere")}
        disabled={!bridge || !evmRecipient || loading}
      >
        Send & Burn NFT
      </button>

      <button
        className="btn btn-secondary mt-4"
        onClick={toggleWhitelist}
        disabled={!bridge || loading}
      >
        Toggle Whitelist
      </button>

      <button
        className="btn btn-secondary mt-4"
        onClick={togglePause}
        disabled={!bridge || loading}
      >
        Toggle Pause
      </button>
    </div>
  );
};

export default WormholeBridge;
