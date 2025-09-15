import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <div className="navbar flex justify-between items-center z-50 px-8">
            <p className="text-lg font-bold text-primary">
                Circles Migration
            </p>
            <WalletModal />
        </div>
    );
}