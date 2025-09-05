import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <div className="navbar z-50 shadow-sm">
            <div className="flex-1">
                <div className="flex justify-center sm:justify-start mt-4 sm:mt-0">
                    <p className="text-lg font-bold text-primary">
                        Circles Migration
                    </p>
                </div>
            </div>
            <div className="flex gap-x-2">
                <WalletModal />
            </div>
        </div>
    );
}