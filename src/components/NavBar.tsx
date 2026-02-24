import WalletModal from "./WalletModal";

export default function Navbar() {
    return (
        <header className="z-50 bg-white border-b border-base-300">
            <nav className="navbar flex justify-between items-center px-4 sm:px-8 py-4">
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
                <div className="flex items-center gap-2 sm:gap-3">
                    <a
                        href="https://docs.aboutcircles.com/user-guides/migrate-v1-account/migrate-circles-v1-account-to-v2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm sm:btn-md text-primary text-sm sm:text-base"
                    >
                        Docs
                    </a>
                    <a
                        href="https://github.com/aboutcircles/circles-migration-tool/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm sm:btn-md text-primary text-sm sm:text-base"
                    >
                        Report Issues
                    </a>
                    <WalletModal />
                </div>
            </nav>
            <div className="px-4 sm:px-8 py-3 bg-warning/10 border-t border-base-300 text-center">
                <p className="text-sm sm:text-base text-base-content">
                    Circles Garden app is now sunsetted. Use this app to migrate your Circles v1 account and import
                    your newly migrated Circles v2 account in{" "}
                    <a
                        href="https://app.gnosis.io/welcome/import"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold underline underline-offset-2"
                    >
                        Gnosis app
                    </a>
                    .
                </p>
            </div>
        </header>
    );
}
