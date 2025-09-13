import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile, Profiles } from '@circles-sdk/profiles';
import { AvatarRow, CirclesData, CirclesRpc, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';

interface CirclesContextType {
  profile: Profile;
  circlesBalance: TokenBalanceRow[] | undefined;
  trustConnections: TrustRelationRow[] | undefined;
  isLoadingProfile: boolean;
  profileError: string | null;
  avatarData: AvatarRow | undefined;
  invitations: AvatarRow[] | undefined;
  isLoadingAvatarData: boolean;
  avatarError: string | null;
}

const fallbackProfile: Profile = {
  name: "Avatar",
  previewImageUrl: "/profile.svg",
};

const CirclesContext = createContext<CirclesContextType | null>(null);

export function CirclesProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(fallbackProfile);
  const [circlesBalance, setCirclesBalance] = useState<TokenBalanceRow[] | undefined>();
  const [trustConnections, setTrustConnections] = useState<TrustRelationRow[] | undefined>();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarRow | undefined>();
  const [isLoadingAvatarData, setIsLoadingAvatarData] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<AvatarRow[] | undefined>();
  const { account } = useWallet();
  const profileService = new Profiles("https://rpc.aboutcircles.com/profiles/");
  const circlesRpc = new CirclesRpc("https://rpc.aboutcircles.com/");
  const data = new CirclesData(circlesRpc);

  const fetchAvatarData = async (address: `0x${string}`) => {
    setIsLoadingAvatarData(true);
    setAvatarError(null);

    try {
      const fetchedAvatarData = await data.getAvatarInfo(address);
      const fetchedCirclesBalance = await data.getTokenBalances(address);
      const fetchedTrustConnections = await data.getAggregatedTrustRelations(address);
      const fetchedInvitations = await data.getInvitations(address);
      console.log(fetchedInvitations);
      setAvatarData(fetchedAvatarData);
      setCirclesBalance(fetchedCirclesBalance);
      setTrustConnections(fetchedTrustConnections);
      setInvitations(fetchedInvitations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch avatar data';
      setAvatarError(errorMessage);
      console.error('Error fetching avatar data:', error, address);
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
      setCirclesBalance(undefined);
      setTrustConnections(undefined);
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
    circlesBalance,
    trustConnections,
    isLoadingProfile,
    profileError,
    avatarData,
    invitations,
    isLoadingAvatarData,
    avatarError,
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