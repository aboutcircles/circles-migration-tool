import { useState, useRef } from "react";
import { useWallet } from "../context/WalletContext";
import { truncateAddress } from "../utils/address";
import { AccountView } from "./AccountView";
import { CirclesGardenView } from "./CirclesGardenView";
import { Menu } from "lucide-react";

export type ModalView = 'main' | 'circles-garden';

export default function WalletModal() {
    const { account, chainName, disconnect } = useWallet();
    const [currentView, setCurrentView] = useState<ModalView>('main');
    const modalRef = useRef<HTMLDialogElement>(null);

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
                    className="btn btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
                    onClick={() => openModal('main')}
                >
                    <span className="font-semibold text-base-content">{truncateAddress(account.address)}</span>
                    <Menu size={20} className="text-primary" />
                </button>
            ) : (
                <button
                    className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all"
                    onClick={() => openModal('circles-garden')}
                >
                    Start migration
                </button>
            )}

            {/* Modal */}
            <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
                <div className={`modal-box ${currentView === 'main' ? 'max-w-lg' : 'max-w-2xl'} p-0 rounded-2xl shadow-2xl`}>
                    {currentView === 'main' && account.address && (
                        <AccountView
                            address={account.address}
                            connectedChain={chainName || 'Unknown'}
                            disconnect={disconnect}
                            onClose={closeModal}
                        />
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
