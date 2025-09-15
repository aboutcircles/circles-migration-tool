import Navbar from "./components/NavBar";
import { WrongNetwork } from "./components/WrongNetwork";
import { useWallet } from "./context/WalletContext";
import { Dashboard } from "./components/Dashboard";


function App() {
	const { account, isWrongNetwork } = useWallet();

	if (isWrongNetwork) {
		return <WrongNetwork />;
	}

	return (
		<>
			<div className="w-full flex flex-col">
				<Navbar />
				{/* Main content */}
				<div className="px-4 py-8">
					{account.isConnected && account.address ? (
						<Dashboard address={account.address} />
					) : (
						<div className="mt-20 w-96 mx-auto border border-base-300 p-4 rounded-md shadow-sm">
							<h1 className="text-lg font-bold">Please connect your wallet to continue</h1>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export default App
