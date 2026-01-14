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
import { JsonRpcProvider } from 'ethers';
import { findSafeFromSigner } from '../utils/safeDerivation';
import { Sdk } from '@circles-sdk/sdk';
import { BrowserProviderContractRunner, PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';

// Get network config for Gnosis chain
const gnosisConfig = NETWORK_CONFIG[gnosis.id];

// Circles SDK config - uses indexer for data queries (circles_* methods)
const circlesSdkConfig = {
  circlesRpcUrl: gnosisConfig.circlesRpcUrl,
  v1HubAddress: gnosisConfig.v1HubAddress,
  v2HubAddress: gnosisConfig.v2HubAddress,
  migrationAddress: gnosisConfig.migrationAddress,
  nameRegistryAddress: gnosisConfig.nameRegistryAddress,
  profileServiceUrl: gnosisConfig.profileServiceUrl,
};

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
  setPkAccount: (account: { privateKey: string, account: PrivateKeyAccount } | undefined) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  console.log('[WalletProvider] Mounting...');
  const { disconnect: disconnectWagmiAccount } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);
  const [pkAccount, setPkAccount] = useState<{ privateKey: string, account: PrivateKeyAccount } | undefined>(undefined);
  const [safeAddress, setSafeAddress] = useState<Address | undefined>(undefined);
  const [circlesSdkRunner, setCirclesSdkRunner] = useState<Sdk | undefined>(undefined);
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
      console.log('[WalletContext] Starting SDK init for:', signerAddress);

      try {
        console.log('[WalletContext] Finding Safe...');
        const safeAddress = await findSafeFromSigner(signerAddress);
        console.log('[WalletContext] Safe found:', safeAddress);

        setSafeAddress(safeAddress || undefined);
        let runner;

        if (safeAddress) {
          console.log('[WalletContext] Initializing Safe runner...');
          if (pkAccount) {
            runner = new SafeSdkPrivateKeyContractRunner(pkAccount.privateKey, gnosisConfig.chainRpcUrl);
            await runner.init(safeAddress as `0x${string}`);
          } else {
            runner = new SafeSdkBrowserContractRunner();
            await runner.init(safeAddress as `0x${string}`);
          }
          console.log('[WalletContext] Runner initialized, creating SDK...');
          let sdk = new Sdk(runner as any, circlesSdkConfig);
          console.log('[WalletContext] SDK created');
          setCirclesSdkRunner(sdk);
        } else {
          console.log('[WalletContext] Initializing EOA runner...');
          if (pkAccount) {
            const rpcProvider = new JsonRpcProvider(gnosisConfig.chainRpcUrl);
            runner = new PrivateKeyContractRunner(rpcProvider, pkAccount.privateKey);
            await runner.init();
          } else {
            runner = new BrowserProviderContractRunner();
            await runner.init();
          }
          console.log('[WalletContext] Runner initialized, creating SDK...');
          let sdk = new Sdk(runner as any, circlesSdkConfig);
          console.log('[WalletContext] SDK created');
          setCirclesSdkRunner(sdk);
        }

      } catch (error) {
        console.error('[WalletContext] Error:', error);
        setSafeAddress(undefined);
        setCirclesSdkRunner(undefined);
      } finally {
        console.log('[WalletContext] Init complete, setting isLoadingSafe=false');
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
      address: safeAddress || wagmiAccount.address,
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