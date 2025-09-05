import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { NETWORK_CONFIG } from '../constants/networks';
import { NetworkConfig } from '../types/network';
import { Address, PrivateKeyAccount } from 'viem';
import { gnosis } from 'viem/chains';

interface WalletContextType {
  account: {
    isConnected: boolean;
    address?: Address;
  };
  chainId?: number;
  pkAccount?: PrivateKeyAccount;
  chainName?: string;
  network?: NetworkConfig;
  isWrongNetwork: boolean;
  isMounted: boolean;
  setPkAccount: (account: PrivateKeyAccount | undefined) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { disconnect: disconnectWagmiAccount } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);
  const [pkAccount, setPkAccount] = useState<PrivateKeyAccount | undefined>(undefined);
  const wagmiAccount = useAccount();
  const chainId = pkAccount ? gnosis.id : wagmiAccount?.chainId;
  const chainName = pkAccount ? gnosis.name : wagmiAccount?.chain?.name;
  const network = chainId ? NETWORK_CONFIG[chainId] : undefined;

  const isConnected = pkAccount ? true : isMounted && wagmiAccount.isConnected;
  const activeAddress = pkAccount ? pkAccount.address : wagmiAccount.address;
  
  const isWrongNetwork = Boolean(isConnected && !network);

  const disconnect = () => {
    if (pkAccount) {
      setPkAccount(undefined);
    } else {
      disconnectWagmiAccount();
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const value = {
    account: {
      isConnected,
      address: activeAddress,
    },
    chainId,
    chainName,
    network,
    isWrongNetwork: isMounted && isWrongNetwork,
    isMounted,
    pkAccount,
    setPkAccount,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 