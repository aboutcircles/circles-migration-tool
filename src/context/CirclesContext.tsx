import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profiles, type SearchResultProfile } from '@circles-sdk/profiles';
import { useWallet } from './WalletContext';
import { useReadContracts } from "wagmi";
import v1HubABI from "../abi/v1Hub";
import v2HubABI from "../abi/v2Hub";

interface CirclesContextType {
  profile: SearchResultProfile | null;
  tokenBalance: bigint | null;
  trustConnections: number | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  userToken: string | null;
  avatarAddress: string | null;
  isRegisteredOnV1: boolean;
  isRegisteredOnV2: boolean;
  isLoadingMigrationData: boolean;
  migrationError: string | null;
}

const CirclesContext = createContext<CirclesContextType | null>(null);

export function CirclesProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SearchResultProfile | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [trustConnections, setTrustConnections] = useState<number | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const { account, network } = useWallet();
  const profileService = new Profiles("https://rpc.aboutcircles.com/profiles/");

  const v1HubContract = network ? {
    address: network.v1HubAddress,
    abi: v1HubABI,
  } as const : null;
  
  const v2HubContract = network ? {
    address: network.v2HubAddress,
    abi: v2HubABI,
  } as const : null;

  const {
    data: migrationData,
    error: migrationError,
    isPending: isLoadingMigrationData
  } = useReadContracts({
    contracts: account.address && v1HubContract && v2HubContract ? [{
      ...v1HubContract,
      functionName: 'userToToken',
      args: [account.address],
    }, {
      ...v2HubContract,
      functionName: 'avatars',
      args: [account.address],
    }, {
      ...v2HubContract,
      functionName: 'isHuman',
      args: [account.address],
    }] : []
  });

  const userToken = migrationData?.[0]?.result as string || null;
  const avatarAddress = migrationData?.[1]?.result as string || null;
  const isRegisteredOnV1 = Boolean(userToken && userToken !== "0x0000000000000000000000000000000000000000");
  const isRegisteredOnV2 = Boolean(avatarAddress && avatarAddress !== "0x0000000000000000000000000000000000000000");

  const fetchProfile = async (address: string) => {
    setIsLoadingProfile(true);
    setProfileError(null);
    
    try {
      const profileData = await profileService.searchByAddress(address);
      // searchByAddress returns an array, we take the first result
      setProfile(profileData && profileData.length > 0 ? profileData[0] : null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
      setProfileError(errorMessage);
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Fetch profile when address changes
  useEffect(() => {
    if (account.isConnected && account.address) {
      fetchProfile(account.address);
    } else {
      setProfile(null);
      setTokenBalance(null);
      setTrustConnections(null);
      setProfileError(null);
    }
  }, [account.isConnected, account.address]);

  const value = {
    profile,
    tokenBalance,
    trustConnections,
    isLoadingProfile,
    profileError,
    userToken,
    avatarAddress,
    isRegisteredOnV1,
    isRegisteredOnV2,
    isLoadingMigrationData,
    migrationError: migrationError?.message || null,
  };

  return <CirclesContext.Provider value={value}>{children}</CirclesContext.Provider>;
}

export function useCircles() {
  const context = useContext(CirclesContext);
  if (!context) {
    throw new Error('useCircles must be used within a CirclesProvider');
  }
  return context;
}