import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { NETWORK_CONFIG } from '../constants/networks';
import { NetworkConfig } from '../types/network';
import { Address, PrivateKeyAccount } from 'viem';
import { gnosis } from 'viem/chains';
import { findSafeFromSigner } from '../utils/safeDerivation';

interface WalletContextType {
  account: {
    isConnected: boolean;
    address?: Address;
  };
  chainId?: number;
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
  const [safeAddress, setSafeAddress] = useState<Address | undefined>(undefined);
  const wagmiAccount = useAccount();
  const chainId = pkAccount ? gnosis.id : wagmiAccount?.chainId;
  const chainName = pkAccount ? gnosis.name : wagmiAccount?.chain?.name;
  const network = chainId ? NETWORK_CONFIG[chainId] : undefined;

  const isConnected = safeAddress ? true : isMounted && wagmiAccount.isConnected;

  const circlesAddress = safeAddress ? safeAddress : wagmiAccount.address;

  const isWrongNetwork = Boolean(isConnected && !network);

  const disconnect = () => {
    if (safeAddress) {
      setPkAccount(undefined);
      setSafeAddress(undefined);
    } else {
      disconnectWagmiAccount();
    }
  };
  
  useEffect(() => {
    if (pkAccount?.address) {
      findSafeFromSigner(pkAccount.address).then((foundSafeAddress) => {
        console.log('Found Safe address:', foundSafeAddress);
        setSafeAddress(foundSafeAddress || undefined);
      }).catch((error) => {
        console.error('Error finding Safe address:', error);
        setSafeAddress(undefined);
      });
    } else {
      setSafeAddress(undefined);
    }
  }, [pkAccount]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const value = {
    account: {
      isConnected,
      address: circlesAddress,
    },
    chainId,
    chainName,
    network,
    isWrongNetwork: isMounted && isWrongNetwork,
    isMounted,
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