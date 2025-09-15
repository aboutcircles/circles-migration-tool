import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile } from '@circles-sdk/profiles';
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';
import { Sdk } from "@circles-sdk/sdk";

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
  const { account, circlesSdkRunner } = useWallet();

  const fetchAvatarData = async (address: `0x${string}`, circlesSdkRunner: Sdk) => {
    setIsLoadingAvatarData(true);
    setAvatarError(null);

    try {
      console.log(circlesSdkRunner);
      const fetchedAvatarData = await circlesSdkRunner.data.getAvatarInfo(address);
      setAvatarData(fetchedAvatarData);

      const [balanceResult, trustResult, invitationsResult] = await Promise.allSettled([
        circlesSdkRunner.data.getTokenBalances(address),
        circlesSdkRunner.data.getAggregatedTrustRelations(address),
        circlesSdkRunner.data.getInvitations(address)
      ]);

      if (balanceResult.status === 'fulfilled') {
        setCirclesBalance(balanceResult.value);
      } else {
        console.warn('Failed to fetch balance:', balanceResult.reason);
        setCirclesBalance([]);
      }

      if (trustResult.status === 'fulfilled') {
        setTrustConnections(trustResult.value);
      } else {
        console.warn('Failed to fetch trust connections:', trustResult.reason);
        setTrustConnections([]);
      }

      if (invitationsResult.status === 'fulfilled') {
        setInvitations(invitationsResult.value);
        console.log(invitationsResult.value);
      } else {
        console.warn('Failed to fetch invitations:', invitationsResult.reason);
        setInvitations([]);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch avatar data';
      setAvatarError(errorMessage);
      console.error('Error fetching avatar data:', error, address);
    } finally {
      setIsLoadingAvatarData(false);
    }
  };

  const fetchProfile = async (cidV0: string, circlesSdkRunner: Sdk) => {
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const profileData = await circlesSdkRunner.profiles?.get(cidV0);
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
    if (account.isConnected && account.address && circlesSdkRunner) {
      fetchAvatarData(account.address as `0x${string}`, circlesSdkRunner);
    } else if (!account.isConnected || !account.address) {
      setAvatarData(undefined);
      setProfile(fallbackProfile);
      setCirclesBalance(undefined);
      setTrustConnections(undefined);
      setProfileError(null);
      setAvatarError(null);
    }
  }, [account.isConnected, account.address, circlesSdkRunner]);

  useEffect(() => {
    if (avatarData?.cidV0 && circlesSdkRunner) {
      fetchProfile(avatarData.cidV0, circlesSdkRunner);
    }
  }, [avatarData, circlesSdkRunner]);

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