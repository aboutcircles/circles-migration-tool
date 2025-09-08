import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile, Profiles } from '@circles-sdk/profiles';
import { AvatarRow, CirclesData, CirclesRpc } from "@circles-sdk/data";
import { useWallet } from './WalletContext';

interface CirclesContextType {
  profile: Profile;
  tokenBalance: bigint | null;
  trustConnections: number | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  avatarData: AvatarRow | undefined;
  isLoadingAvatarData: boolean;
  avatarError: string | null;
  userToken: string | null;
  avatarAddress: string | null;
  isRegisteredOnV1: boolean;
  isRegisteredOnV2: boolean;
}

const fallbackProfile: Profile = {
  name: "Fallback Profile",
  previewImageUrl: "https://via.placeholder.com/150",
};

const CirclesContext = createContext<CirclesContextType | null>(null);

export function CirclesProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(fallbackProfile);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [trustConnections, setTrustConnections] = useState<number | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarRow | undefined>();
  const [isLoadingAvatarData, setIsLoadingAvatarData] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const { account } = useWallet();
  const profileService = new Profiles("https://rpc.aboutcircles.com/profiles/");
  const circlesRpc = new CirclesRpc("https://rpc.aboutcircles.com/");
  const data = new CirclesData(circlesRpc);

  const userToken = avatarData?.v1Token || null;
  const avatarAddress = avatarData?.avatar || null;
  const isRegisteredOnV1 = Boolean(avatarData?.hasV1);
  const isRegisteredOnV2 = Boolean(avatarData?.version === 2);

  const fetchAvatarData = async (address: string) => {
    setIsLoadingAvatarData(true);
    setAvatarError(null);

    try {
      const fetchedAvatarData = await data.getAvatarInfo(address.toLowerCase() as `0x${string}`);
      console.log('avatarData', fetchedAvatarData, address);
      setAvatarData(fetchedAvatarData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch avatar data';
      setAvatarError(errorMessage);
      console.error('Error fetching avatar data:', error);
    } finally {
      setIsLoadingAvatarData(false);
    }
  };

  const fetchProfile = async (cidV0: string) => {
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const profileData = await profileService.get(cidV0);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
      setProfileError(errorMessage);
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (account.isConnected && account.address) {
      fetchAvatarData(account.address);
    } else {
      setAvatarData(undefined);
      setProfile(fallbackProfile);
      setTokenBalance(null);
      setTrustConnections(null);
      setProfileError(null);
      setAvatarError(null);
    }
  }, [account.isConnected, account.address]);

  useEffect(() => {
    if (avatarData?.cidV0) {
      fetchProfile(avatarData.cidV0);
    }
  }, [avatarData]);

  const value = {
    profile,
    tokenBalance,
    trustConnections,
    isLoadingProfile,
    profileError,
    avatarData,
    isLoadingAvatarData,
    avatarError,
    userToken,
    avatarAddress,
    isRegisteredOnV1,
    isRegisteredOnV2,
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