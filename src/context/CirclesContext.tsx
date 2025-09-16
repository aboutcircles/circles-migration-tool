import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile } from '@circles-sdk/profiles';
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';
import { Sdk } from "@circles-sdk/sdk";

export interface AvatarWithProfile {
  avatar: AvatarRow;
  profile: Profile;
}

interface CirclesContextType {
  circlesBalance: TokenBalanceRow[] | undefined;
  trustConnections: TrustRelationRow[] | undefined;
  profileError: string | null;
  avatarWithProfile: AvatarWithProfile | undefined;
  invitationsWithProfiles: AvatarWithProfile[] | undefined;
  isLoadingAvatarData: boolean;
  avatarError: string | null;
}

export const fallbackProfile: Profile = {
  name: "Avatar",
  previewImageUrl: "/profile.svg",
};

const CirclesContext = createContext<CirclesContextType | null>(null);

export function CirclesProvider({ children }: { children: ReactNode }) {
  const [circlesBalance, setCirclesBalance] = useState<TokenBalanceRow[] | undefined>();
  const [trustConnections, setTrustConnections] = useState<TrustRelationRow[] | undefined>();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarWithProfile, setAvatarWithProfile] = useState<AvatarWithProfile | undefined>();
  const [isLoadingAvatarData, setIsLoadingAvatarData] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [invitationsWithProfiles, setInvitationsWithProfiles] = useState<AvatarWithProfile[] | undefined>();
  const { account, circlesSdkRunner } = useWallet();

  const fetchAvatarData = async (address: `0x${string}`, circlesSdkRunner: Sdk) => {
    setIsLoadingAvatarData(true);
    setAvatarError(null);

    try {
      const fetchedAvatarData = await circlesSdkRunner.data.getAvatarInfo(address);

      if (fetchedAvatarData) {
        const avatarWithProfile = await fetchAvatarProfiles([fetchedAvatarData], circlesSdkRunner);
        setAvatarWithProfile(avatarWithProfile[0]);
      }

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
        const invitationsData = invitationsResult.value;
        const avatarsWithProfiles = await fetchAvatarProfiles(invitationsData, circlesSdkRunner);
        setInvitationsWithProfiles(avatarsWithProfiles);
      } else {
        console.warn('Failed to fetch invitations:', invitationsResult.reason);
        setInvitationsWithProfiles([]);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch avatar data';
      setAvatarError(errorMessage);
      console.error('Error fetching avatar data:', error, address);
    } finally {
      setIsLoadingAvatarData(false);
    }
  };

  const fetchAvatarProfiles = async (avatars: AvatarRow[], circlesSdkRunner: Sdk) => {
    const avatarsWithProfiles: AvatarWithProfile[] = [];
    
    for (const avatar of avatars) {
      const avatarWithProfile: AvatarWithProfile = { 
        avatar: avatar,
        profile: fallbackProfile
      };
      
      if (avatar.cidV0) {
        try {
          const profileData = await circlesSdkRunner.profiles?.get(avatar.cidV0);
          if (profileData) {
            avatarWithProfile.profile = profileData;
          }
        } catch (error) {
          console.warn(`Failed to fetch profile for avatar ${avatar.avatar}, using fallback:`, error);
        }
      }
      
      avatarsWithProfiles.push(avatarWithProfile);
    }

    return avatarsWithProfiles;
  };

  useEffect(() => {
    if (account.isConnected && account.address && circlesSdkRunner) {
      fetchAvatarData(account.address as `0x${string}`, circlesSdkRunner);
    } else if (!account.isConnected || !account.address) {
      setAvatarWithProfile(undefined);
      setCirclesBalance(undefined);
      setTrustConnections(undefined);
      setInvitationsWithProfiles(undefined);
      setProfileError(null);
      setAvatarError(null);
    }
  }, [account.isConnected, account.address, circlesSdkRunner]);

  const value = {
    circlesBalance,
    trustConnections,
    profileError,
    avatarWithProfile,
    invitationsWithProfiles,
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