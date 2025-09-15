import { useState, useRef } from "react";
import { useWallet } from "../context/WalletContext";
import { truncateAddress } from "../utils/address";
import { AccountView } from "./AccountView";
import { SelectWalletView } from "./SelectWalletView";
import { CirclesGardenView } from "./CirclesGardenView";
import { Menu } from "lucide-react";

export type ModalView = 'main' | 'circles-garden' | 'select-wallet';

export default function WalletModal() {
    const { account, chainName, disconnect } = useWallet();
    const [currentView, setCurrentView] = useState<ModalView>('main');
    const modalRef = useRef<HTMLDialogElement>(null);

    const handleViewChange = (view: ModalView) => {
        setCurrentView(view);
    };

    const openModal = (view: ModalView = 'main') => {
        setCurrentView(view);
        modalRef.current?.showModal();
    };

    const closeModal = () => {
        modalRef.current?.close();
    };

    return (
        <>
            {account.isConnected && account.address ? (
                <button
                    className="btn btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-base-300/50 transition-all duration-200"
                    onClick={() => openModal('main')}
                >
                    <span className="font-medium">{truncateAddress(account.address)}</span>
                    <Menu size={20} />
                </button>
            ) : (
                <button
                    className="btn btn-primary"
                    onClick={() => openModal('select-wallet')}
                >
                    Connect Wallet
                </button>
            )}

            {/* Modal */}
            <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
                <div className={`modal-box ${currentView === 'main' ? 'max-w-lg' : 'max-w-2xl'} p-0`}>
                    {currentView === 'main' && account.address && (
                        <AccountView
                            address={account.address}
                            connectedChain={chainName || 'Unknown'}
                            disconnect={disconnect}
                            onClose={closeModal}
                        />
                    )}
                    {currentView === 'select-wallet' && (
                        <SelectWalletView onClose={closeModal} onViewChange={handleViewChange} />
                    )}
                    {currentView === 'circles-garden' && (
                        <CirclesGardenView onClose={closeModal} />
                    )}
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button type="button" onClick={closeModal}>close</button>
                </form>
            </dialog>
        </>
    );
}