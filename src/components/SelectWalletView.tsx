import { ModalView } from './WalletModal';

interface SelectWalletViewProps {
	onViewChange: (view: ModalView) => void;
}

export function SelectWalletView({ onViewChange }: SelectWalletViewProps) {

	return (
		<div className="p-6 sm:p-8">
			{/* Header */}
			<h1 className="text-2xl sm:text-3xl mb-2 font-bold text-primary">Import from Circles Garden</h1>
			<p className="text-base-content/70 mb-6 text-sm sm:text-base">
				Import your wallet using your Circles Garden seed phrase
			</p>

			{/* Wallet Grid */}
			<div className="flex justify-center mb-6">
				{/* Circles Garden Option */}
				<button
					className="group relative bg-white hover:bg-primary/5 border-2 border-base-300 hover:border-primary hover:cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-md w-full sm:w-80"
					onClick={() => onViewChange('circles-garden')}
				>
					<div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
						<img src="/circles.svg" className="w-7 h-7 sm:w-8 sm:h-8" alt="Circles Garden" />
					</div>
					<span className="font-semibold text-sm sm:text-base text-base-content group-hover:text-primary transition-colors">
						Circles Garden
					</span>
				</button>
			</div>
		</div>
	);
}
