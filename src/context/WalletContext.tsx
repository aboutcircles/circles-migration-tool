import { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { GNOSIS_CHAIN_RPC_URL, NETWORK_CONFIG } from '../constants/networks';
import { NetworkConfig } from '../types/network';
import { Address, PrivateKeyAccount } from 'viem';
import { gnosis } from 'viem/chains';
import { JsonRpcProvider } from 'ethers';
import { findSafesFromSigner } from '../utils/safeDerivation';
import { Sdk } from '@circles-sdk/sdk';
import { BrowserProviderContractRunner, PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
import { SafeSdkBrowserContractRunner, SafeSdkPrivateKeyContractRunner } from '@circles-sdk/adapter-safe';
import { fetchSafeAvatarTags, SafeAvatarTag } from '../utils/safeAvatarTags';

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
  safeAddresses: Address[];
  safeAvatarTags: Record<string, SafeAvatarTag>;
  isLoadingSafeAvatarTags: boolean;
  eoaAddress?: Address;
  circlesSdkRunner?: Sdk;
  isLoadingSafe: boolean;
  seedPhrase?: string;
  setPkAccount: (account: { privateKey: string, account: PrivateKeyAccount, seedPhrase?: string } | undefined) => void;
  setSelectedSafeAddress: (safeAddress: Address | undefined) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { disconnect: disconnectWagmiAccount } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);
  const [pkAccount, setPkAccount] = useState<{ privateKey: string, account: PrivateKeyAccount, seedPhrase?: string } | undefined>(undefined);
  const [safeAddress, setSafeAddress] = useState<Address | undefined>(undefined);
  const [safeAddresses, setSafeAddresses] = useState<Address[]>([]);
  const [safeAvatarTags, setSafeAvatarTags] = useState<Record<string, SafeAvatarTag>>({});
  const [isLoadingSafeAvatarTags, setIsLoadingSafeAvatarTags] = useState(false);
  const [selectedSafeAddress, setSelectedSafeAddress] = useState<Address | undefined>(undefined);
  const [circlesSdkRunner, setCirclesSdkRunner] = useState<Sdk | undefined>(undefined);
  const [isLoadingSafe, setIsLoadingSafe] = useState(false);
  const wagmiAccount = useAccount();
  const initRequestIdRef = useRef(0);

  const chainId = pkAccount ? gnosis.id : wagmiAccount?.chainId;
  const chainName = pkAccount ? gnosis.name : wagmiAccount?.chain?.name;
  const network = chainId ? NETWORK_CONFIG[chainId] : undefined;

  const signerAddress = pkAccount?.account.address || wagmiAccount.address;

  const isConnected = Boolean(safeAddress || (isMounted && wagmiAccount.isConnected));

  const isWrongNetwork = Boolean(isConnected && !network);

  const disconnect = () => {
    setPkAccount(undefined);
    setSafeAddress(undefined);
    setSafeAddresses([]);
    setSafeAvatarTags({});
    setIsLoadingSafeAvatarTags(false);
    setSelectedSafeAddress(undefined);
    setCirclesSdkRunner(undefined);
    setIsLoadingSafe(false);

    if (wagmiAccount.isConnected) {
      disconnectWagmiAccount();
    }
  };

  useEffect(() => {
    const requestId = ++initRequestIdRef.current;
    let isCancelled = false;
    const isStale = () => isCancelled || requestId !== initRequestIdRef.current;

    const initializeSafeAndSdk = async () => {
      if (!signerAddress) {
        if (isStale()) {
          return;
        }
        setSafeAddress(undefined);
        setSafeAddresses([]);
        setSafeAvatarTags({});
        setIsLoadingSafeAvatarTags(false);
        setCirclesSdkRunner(undefined);
        setIsLoadingSafe(false);
        return;
      }

      if (!isStale()) {
        setIsLoadingSafe(true);
        setIsLoadingSafeAvatarTags(true);
      }

      try {
        const safes = await findSafesFromSigner(signerAddress);
        if (isStale()) {
          return;
        }
        const dedupedSafes = Array.from(new Map(
          safes.map((safe) => [safe.toLowerCase(), safe])
        ).values());
        const matchingSelectedSafe = selectedSafeAddress
          ? dedupedSafes.find((safe) => safe.toLowerCase() === selectedSafeAddress.toLowerCase())
          : undefined;
        const nextSafeAddress = matchingSelectedSafe || dedupedSafes[0];

        console.log('Safe addresses fetched:', dedupedSafes.length > 0 ? dedupedSafes : 'No Safes found');
        console.log('Signer EOA Address:', signerAddress);

        if (!matchingSelectedSafe && nextSafeAddress && !isStale()) {
          setSelectedSafeAddress(nextSafeAddress || undefined);
        }

        if (isStale()) {
          return;
        }

        setSafeAddresses(dedupedSafes);
        setSafeAddress(nextSafeAddress || undefined);
        let runner;
        let sdk: Sdk;

        if (nextSafeAddress) {

          if (pkAccount) {
            runner = new SafeSdkPrivateKeyContractRunner(
              pkAccount.privateKey,
              GNOSIS_CHAIN_RPC_URL
            );
            await runner.init(nextSafeAddress as `0x${string}`);
            if (isStale()) {
              return;
            }
          } else {
            runner = new SafeSdkBrowserContractRunner();
            await runner.init(nextSafeAddress as `0x${string}`);
            if (isStale()) {
              return;
            }
          }
          sdk = new Sdk(runner as any, network as any);
          setCirclesSdkRunner(sdk);
        } else {
          if (pkAccount) {
            const rpcProvider = new JsonRpcProvider(GNOSIS_CHAIN_RPC_URL);
            runner = new PrivateKeyContractRunner(rpcProvider, pkAccount.privateKey);
            await runner.init();
            if (isStale()) {
              return;
            }
          } else {
            runner = new BrowserProviderContractRunner();
            await runner.init();
            if (isStale()) {
              return;
            }
          }
          sdk = new Sdk(runner as any, network as any);
          setCirclesSdkRunner(sdk);
        }

        if (dedupedSafes.length > 0) {
          const tags = await fetchSafeAvatarTags(sdk, dedupedSafes);
          if (isStale()) {
            return;
          }
          setSafeAvatarTags(tags);
        } else {
          setSafeAvatarTags({});
        }

      } catch (error) {
        if (isStale()) {
          return;
        }
        console.error('Error finding Safe address or initializing SDK:', error);
        setSafeAddress(undefined);
        setSafeAddresses([]);
        setSafeAvatarTags({});
        setCirclesSdkRunner(undefined);
      } finally {
        if (!isStale()) {
          setIsLoadingSafe(false);
          setIsLoadingSafeAvatarTags(false);
        }
      }
    };

    initializeSafeAndSdk();

    return () => {
      isCancelled = true;
    };
  }, [signerAddress, pkAccount, selectedSafeAddress]);

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
    safeAddresses,
    safeAvatarTags,
    isLoadingSafeAvatarTags,
    eoaAddress: signerAddress,
    circlesSdkRunner,
    isLoadingSafe,
    seedPhrase: pkAccount?.seedPhrase,
    setPkAccount,
    setSelectedSafeAddress,
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
