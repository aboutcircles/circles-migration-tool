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
		<div className="p-8">
			{/* Header */}
			<h1 className="text-2xl mb-5 font-bold text-base-content">Available Wallets</h1>

			{/* Wallet Grid */}
			<div className="grid grid-cols-2 gap-4 mb-6">
				{/* Circles Garden Option */}
				<button
					className="group relative bg-base-100 hover:bg-base-200/50 border border-base-300 hover:border-primary/30 hover:cursor-pointer rounded-xl p-6 transition-all duration-200 flex flex-col items-center text-center"
					onClick={() => onViewChange('circles-garden')}
				>
					<div className="w-12 h-12 bg-base-200 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
						<img src="/circles.svg" className="w-6 h-6" alt="Circles Garden" />
					</div>
					<span className="font-medium text-base-content group-hover:text-primary transition-colors">
						Circles Garden
					</span>
				</button>

				{/* Wallet Options */}
				{uniqueConnectors.map((connector) => (
					<button
						key={connector.uid}
						className="group relative bg-base-100 hover:bg-base-200/50 border border-base-300 hover:border-primary/30 hover:cursor-pointer rounded-xl p-6 transition-all duration-200 flex flex-col items-center text-center"
						onClick={() => handleConnect(connector)}
					>
						<div className="w-12 h-12 bg-base-200 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
							{connector.icon ? (
								<img
									src={connector.icon}
									className="w-6 h-6"
									alt={`${connector.name} icon`}
								/>
							) : (
								<div className="w-6 h-6 bg-base-300 rounded"></div>
							)}
						</div>
						<span className="font-medium text-base-content group-hover:text-primary transition-colors">
							{connector.name}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
