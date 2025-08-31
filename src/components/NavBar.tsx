import { SelectWallet } from "./SelectWallet";
import { useWallet } from "../context/WalletContext";
import { truncateAddress } from "../utils/address";
import { Menu, X } from "lucide-react";
import { useDisconnect } from "wagmi";

export default function Navbar() {
    const { account } = useWallet();
    const { disconnect } = useDisconnect();
    return (
        <div className="navbar z-50 bg-base-200 shadow-sm">
            <div className="flex-1">
                <div className="flex justify-center sm:justify-start mt-4 sm:mt-0">
                    <p className="text-lg font-bold">
                        Circles Migration tool
                    </p>
                </div>
            </div>
            <div className="flex gap-x-2">
                {account.isConnected && account.address ? (
                    <button
                        className="btn btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-base-300 transition-all duration-200"
                        onClick={() => disconnect()}
                    >
                        <span className="font-medium">{truncateAddress(account.address)}</span>
                        <Menu size={20} className="transition-all duration-200" />
                    </button>
                ) : (
                    <SelectWallet />
                )}
            </div>
        </div>
    );
}