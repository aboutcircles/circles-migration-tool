import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <div className="navbar flex justify-between items-center z-50 px-4 sm:px-8 bg-base-100 border-b border-base-300">
            <div className="flex items-center gap-3">
                <img 
                    src="/circles.svg" 
                    alt="Circles" 
                    className="w-8 h-8 sm:w-10 sm:h-10"
                />
                <h1 className="text-lg sm:text-xl font-bold text-primary">
                    Circles Migration
                </h1>
            </div>
            <WalletModal />
        </div>
    );
}