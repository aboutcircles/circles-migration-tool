import { useRef, useEffect, useState } from 'react';
import { gnosis } from 'viem/chains';
import { Connector, useConnect } from 'wagmi';

export function SelectWallet() {
	const [isMounted, setIsMounted] = useState(false);
	const { connectors, connect } = useConnect();
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const uniqueConnectors = connectors.reduce<Connector[]>((acc, connector) => {
		const names = acc.map((c) => c.name);
		if (!names.includes(connector.name)) {
			acc.push(connector);
		}
		return acc;
	}, []);

	return (
		<>
			<button className="btn" onClick={() => dialogRef.current?.showModal()}>
				Connect
			</button>
			<dialog ref={dialogRef} className="modal">
				<div className="modal-box">
					<h1 className="text-2xl font-bold">Select Wallet</h1>
					<p className="text-xs text-warning text-left mb-4">
						Select a wallet to connect to the app.
					</p>
					<div className="list gap-y-2">
						{isMounted ? uniqueConnectors.map((connector) => {
							return (
								<button
									className="list-row flex w-full justify-between items-center text-white btn"
									key={connector.uid}
									onClick={() =>
										connect({
											connector: connector,
											chainId: gnosis.id,
										})
									}
								>
									{connector.name} {connector.icon ? <img src={connector.icon} className="w-4 h-4" /> : null}
								</button>
							);
						}) : (
							<div className="flex justify-center p-4">
								<div className="loading loading-spinner loading-sm"></div>
								<span className="ml-2">Loading wallets...</span>
							</div>
						)}
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
		</>
	);
}
