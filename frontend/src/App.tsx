import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { web3AuthConfig, authAdapterConfig } from "./config/web3auth";
import EthereumRPC from "./RPC/ethRPC-web3"; // for using web3.js
import SolanaRPC from "./RPC/solanaRPC"; // for using solana

function App() {
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

export default App;
