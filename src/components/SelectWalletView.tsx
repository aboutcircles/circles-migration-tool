import { gnosis } from 'viem/chains';
import { Connector, useConnect } from 'wagmi';
import { ModalView } from './WalletModal';

interface SelectWalletViewProps {
	onClose: () => void;
	onViewChange: (view: ModalView) => void;
}

export function SelectWalletView({ onClose, onViewChange }: SelectWalletViewProps) {
	const { connectors, connect } = useConnect();

	const uniqueConnectors = connectors.reduce<Connector[]>((acc, connector) => {
		const names = acc.map((c) => c.name);
		if (!names.includes(connector.name)) {
			acc.push(connector);
		}
		return acc;
	}, []);

	const handleConnect = (connector: Connector) => {
		connect({
			connector: connector,
			chainId: gnosis.id,
		});
		onClose?.();
	};

	return (
		<div className="p-6 sm:p-8">
			{/* Header */}
			<h1 className="text-2xl sm:text-3xl mb-2 font-bold text-primary">Connect Wallet</h1>
			<p className="text-base-content/70 mb-6 text-sm sm:text-base">
				Choose your preferred wallet to continue
			</p>

			{/* Wallet Grid */}
			<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
				{/* Circles Garden Option */}
				<button
					className="group relative bg-white hover:bg-primary/5 border-2 border-base-300 hover:border-primary hover:cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-md"
					onClick={() => onViewChange('circles-garden')}
				>
					<div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
						<img src="/circles.svg" className="w-7 h-7 sm:w-8 sm:h-8" alt="Circles Garden" />
					</div>
					<span className="font-semibold text-sm sm:text-base text-base-content group-hover:text-primary transition-colors">
						Circles Garden
					</span>
				</button>

				{/* Wallet Options */}
				{uniqueConnectors.map((connector) => (
					<button
						key={connector.uid}
						className="group relative bg-white hover:bg-primary/5 border-2 border-base-300 hover:border-primary hover:cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-md"
						onClick={() => handleConnect(connector)}
					>
						<div className="w-12 h-12 sm:w-14 sm:h-14 bg-base-200 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
							{connector.icon ? (
								<img
									src={connector.icon}
									className="w-7 h-7 sm:w-8 sm:h-8"
									alt={`${connector.name} icon`}
								/>
							) : (
								<div className="w-7 h-7 sm:w-8 sm:h-8 bg-base-300 rounded-lg"></div>
							)}
						</div>
						<span className="font-semibold text-sm sm:text-base text-base-content group-hover:text-primary transition-colors">
							{connector.name}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
