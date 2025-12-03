import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <nav className="navbar flex justify-between items-center z-50 px-4 sm:px-8 py-4 bg-white border-b border-base-300">
            <div className="flex items-center gap-3">
                <img 
                    src="/circles.svg" 
                    alt="Circles" 
                    className="w-10 h-10 sm:w-12 sm:h-12"
                />
                <div className="flex flex-col">
                    <h1 className="text-lg sm:text-xl font-bold text-primary">
                        Circles
                    </h1>
                    <p className="text-xs sm:text-sm text-base-content/60 font-medium -mt-0.5">
                        Profile Migration
                    </p>
                </div>
            </div>
            <WalletModal />
        </nav>
    );
}