import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <div className="navbar flex justify-between items-center z-50 px-4 sm:px-8">
            <p className="text-lg font-bold text-black">
                Circles Migration
            </p>
            <WalletModal />
        </div>
    );
}