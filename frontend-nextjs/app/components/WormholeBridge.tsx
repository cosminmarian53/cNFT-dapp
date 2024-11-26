import { useState } from "react";
import {
  wormhole,
  Wormhole,
  TokenTransfer,
  amount,
  Chain,
  Network,
  TokenId,
} from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import { PublicKey, Keypair } from "@solana/web3.js";
import { IProvider } from "@web3auth/base";
import { SignerStuff, getSigner, getTokenDecimals } from "../helpers/helpers";

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

  const transfer = async () => {
    if (!provider || !assetId || !solanaKeypair) {
      uiConsole("Provider, assetId, or solanaKeypair not initialized yet");
      return;
    }

    try {
      setLoading(true);
      // Initialize Wormhole SDK
      const wh = await wormhole("Testnet", [evm, solana]);
      // Get the source and destination chains
      const srcChain = wh.getChain("Solana");
      const dstChain = wh.getChain("Bsc");
      // Get the token ID
      const token = Wormhole.tokenId(srcChain.chain, assetId.toString());
      // Transfer the NFT from Solana to EVM chain
      const source = await getSigner(srcChain, provider);
      const destination = await getSigner(dstChain, provider);
      const amt = "1";
      const automatic = false;
      const decimals = await getTokenDecimals(wh, token, srcChain);
      const xfer = await tokenTransfer(wh, {
        token,
        amount: amount.units(amount.parse(amt, decimals)),
        source,
        destination,
        automatic,
      });

      console.log("Starting transfer");
      const srcTxids = await xfer.initiateTransfer(source.signer);
      console.log(`Source Transaction ID: ${srcTxids[0]}`);
      console.log(`Wormhole Transaction ID: ${srcTxids[1] ?? srcTxids[0]}`);

      console.log("Getting Attestation");
      await xfer.fetchAttestation(60_000);

      console.log("Completing Transfer");
      const destTxids = await xfer.completeTransfer(destination.signer);
      console.log(`Completed Transfer: `, destTxids);

      uiConsole("Transfer successful:", destTxids);
    } catch (error) {
      console.error("Error transferring NFT:", error);
      uiConsole("Error transferring NFT:", error);
    } finally {
      setLoading(false);
    }
  };

  async function tokenTransfer<N extends Network>(
    wh: Wormhole<N>,
    route: {
      token: TokenId;
      amount: bigint;
      source: SignerStuff<N, Chain>;
      destination: SignerStuff<N, Chain>;
      automatic: boolean;
      payload?: Uint8Array;
    }
  ) {
    // Token Transfer Logic
    // Create a TokenTransfer object to track the state of the transfer over time
    const xfer = await wh.tokenTransfer(
      route.token,
      route.amount,
      route.source.address,
      route.destination.address,
      route.automatic ?? false,
      route.payload
    );

    const quote = await TokenTransfer.quoteTransfer(
      wh,
      route.source.chain,
      route.destination.chain,
      xfer.transfer
    );
    if (xfer.transfer.automatic && quote.destinationToken.amount < 0)
      throw new Error(
        "The amount requested is too low to cover the fee and any native gas requested."
      );

    return xfer;
  }

  return (
    <div className="wormhole-bridge">
      <button
        onClick={transfer}
        className={`btn ${
          loading ? "bg-gray-400 cursor-not-allowed" : "hover:bg-purple-500"
        } p-1 rounded-md transition-colors`}
        disabled={loading}
      >
        {loading ? "Transferring..." : "Transfer NFT"}
      </button>
    </div>
  );
};

export default WormholeBridge;
