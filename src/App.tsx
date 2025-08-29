import Navbar from "./components/NavBar";
import { WrongNetwork } from "./components/WrongNetwork";
import { useWallet } from "./context/WalletContext";


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
			<div className="flex px-8 flex-col h-full w-full items-center justify-center bg-base-100">
				{account.isConnected && account.address && network && chainId ? (
					<>
					</>
				) : (
					<h1 className="text-xl font-bold">Please connect your wallet to continue</h1>
				)}
			</div>
		</div>
    </>
  )
}

export default App
