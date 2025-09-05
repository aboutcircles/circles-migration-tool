import Navbar from "./components/NavBar";
import { WrongNetwork } from "./components/WrongNetwork";
import { useWallet } from "./context/WalletContext";
import { Dashboard } from "./components/Dashboard";


function App() {
	const { account, chainId, network, isWrongNetwork } = useWallet();

  if (isWrongNetwork) {
		return <WrongNetwork />;
	}

  return (
    <>
      <div className="w-full h-screen flex flex-col">
			<Navbar />
			{/* Main content */}
			<div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
				{account.isConnected && account.address && network && chainId ? (
					<Dashboard address={account.address} network={network} />
				) : (
					<h1 className="text-xl font-bold">Please connect your wallet to continue</h1>
				)}
			</div>
		</div>
    </>
  )
}

export default App
