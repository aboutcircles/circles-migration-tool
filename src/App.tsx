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
		<div className="min-h-screen gradient-circles">
			<div className="w-full flex flex-col">
				<Navbar />
				{/* Main content */}
				<div className="px-4 py-8">
					{account.isConnected && account.address ? (
						<Dashboard address={account.address} />
					) : (
						<div className="mt-20 max-w-md mx-auto bg-white border border-base-300 p-8 rounded-2xl shadow-lg">
							<h1 className="text-xl font-bold text-center text-base-content mb-2">
								Welcome to Circles Migration
							</h1>
							<p className="text-center text-base-content/70 text-sm mb-6">
								Connect your wallet to begin migrating your Circles profile to V2
							</p>
							<div className="flex justify-center">
								<div className="w-24 h-24 opacity-20">
									<img src="/circles.svg" alt="Circles" />
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default App
