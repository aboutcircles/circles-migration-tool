import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { NETWORK_CONFIG } from '../constants/networks';
import { NetworkConfig } from '../types/network';
import { Address, PrivateKeyAccount } from 'viem';
import { gnosis } from 'viem/chains';
import {
  SafeSdkBrowserContractRunner,
  SafeSdkPrivateKeyContractRunner,
} from '@circles-sdk/adapter-safe';
import { findSafeFromSigner } from '../utils/safeDerivation';
import { Sdk } from '@circles-sdk/sdk';

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
  safeAddress?: Address;
  circlesSdkRunner?: Sdk;
  isLoadingSafe: boolean;
  setPkAccount: (account: {privateKey: string, account: PrivateKeyAccount} | undefined) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { disconnect: disconnectWagmiAccount } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);
  const [pkAccount, setPkAccount] = useState<{privateKey: string, account: PrivateKeyAccount} | undefined>(undefined);
  const [safeAddress, setSafeAddress] = useState<Address | undefined>(undefined);
  const [circlesSdkRunner, setCirclesSdkRunner] = useState<any>(undefined);
  const [isLoadingSafe, setIsLoadingSafe] = useState(false);
  const wagmiAccount = useAccount();

  const chainId = pkAccount ? gnosis.id : wagmiAccount?.chainId;
  const chainName = pkAccount ? gnosis.name : wagmiAccount?.chain?.name;
  const network = chainId ? NETWORK_CONFIG[chainId] : undefined;

  const signerAddress = pkAccount?.account.address || wagmiAccount.address;

  const isConnected = Boolean(safeAddress || (isMounted && wagmiAccount.isConnected));

  const isWrongNetwork = Boolean(isConnected && !network);

  const disconnect = () => {
    setPkAccount(undefined);
    setSafeAddress(undefined);
    setCirclesSdkRunner(undefined);
    setIsLoadingSafe(false);

    if (wagmiAccount.isConnected) {
      disconnectWagmiAccount();
    }
  };

  useEffect(() => {
    const initializeSafeAndSdk = async () => {
      if (!signerAddress) {
        setSafeAddress(undefined);
        setCirclesSdkRunner(undefined);
        setIsLoadingSafe(false);
        return;
      }

      setIsLoadingSafe(true);

      try {
        const safeAddress = await findSafeFromSigner(signerAddress);
        console.log('Found Safe address:', safeAddress, 'for signer:', signerAddress);

        setSafeAddress(safeAddress || undefined);

        if (safeAddress) {
          let runner;

          if (pkAccount) {
            console.log('Initializing SDK with private key runner');
            runner = new SafeSdkPrivateKeyContractRunner(pkAccount.privateKey, 'https://rpc.aboutcircles.com/');
            await runner.init(safeAddress as `0x${string}`);
          } else {
            console.log('Initializing SDK with browser runner');
            runner = new SafeSdkBrowserContractRunner();
            await runner.init(safeAddress as `0x${string}`);
          }
          let sdk = new Sdk(runner);

          setCirclesSdkRunner(sdk);
        } else {
          setCirclesSdkRunner(undefined);
        }

      } catch (error) {
        console.error('Error finding Safe address or initializing SDK:', error);
        setSafeAddress(undefined);
        setCirclesSdkRunner(undefined);
      } finally {
        setIsLoadingSafe(false);
      }
    };

    initializeSafeAndSdk();
  }, [signerAddress, pkAccount]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const value = {
    account: {
      isConnected,
      address: safeAddress,
    },
    chainId,
    chainName,
    network,
    isWrongNetwork: isMounted && isWrongNetwork,
    isMounted,
    safeAddress,
    circlesSdkRunner,
    isLoadingSafe,
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