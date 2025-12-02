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
			<div className="min-h-screen w-full flex flex-col bg-base-200">
				<Navbar />
				{/* Main content */}
				<div className="flex-1 px-4 py-8">
					{account.isConnected && account.address ? (
						<Dashboard address={account.address} />
					) : (
						<div className="mt-20 w-full max-w-md mx-auto bg-base-100 border border-base-300 p-8 rounded-box shadow-lg">
							<h1 className="text-xl font-bold text-center text-base-content">Please connect your wallet to continue</h1>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export default App
