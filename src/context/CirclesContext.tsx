import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Profile } from '@circles-sdk/profiles';
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';
import { isNoBalancesRpcError } from "../utils/migrationFallback";
import { Sdk } from "@circles-sdk/sdk";

export interface AvatarWithProfile {
  avatar: AvatarRow;
  profile: Profile;
}

interface CirclesContextType {
  circlesBalance: TokenBalanceRow[] | undefined;
  trustConnections: TrustRelationRow[] | undefined;
  avatarWithProfile: AvatarWithProfile | undefined;
  isLoadingAvatarData: boolean;
  refreshData: () => Promise<void>;
}

export const fallbackProfile: Profile = {
  name: "Avatar",
  previewImageUrl: "/profile.svg",
};

const CirclesContext = createContext<CirclesContextType | null>(null);

export function CirclesProvider({ children }: { children: ReactNode }) {
  const [circlesBalance, setCirclesBalance] = useState<TokenBalanceRow[] | undefined>();
  const [trustConnections, setTrustConnections] = useState<TrustRelationRow[] | undefined>();
  const [avatarWithProfile, setAvatarWithProfile] = useState<AvatarWithProfile | undefined>();
  const [isLoadingAvatarData, setIsLoadingAvatarData] = useState(false);
  const { account, circlesSdkRunner } = useWallet();
  const fetchRequestIdRef = useRef(0);

  const clearAccountScopedData = () => {
    setAvatarWithProfile(undefined);
    setCirclesBalance(undefined);
    setTrustConnections(undefined);
  };

  const fetchAvatarData = async (address: `0x${string}`, circlesSdkRunner: Sdk, requestId: number) => {
    const isStale = () => requestId !== fetchRequestIdRef.current;

    if (isStale()) {
      return;
    }

    setIsLoadingAvatarData(true);

    try {
      const fetchedAvatarData = await circlesSdkRunner.data.getAvatarInfo(address);
      if (isStale()) {
        return;
      }

      if (fetchedAvatarData) {
        const avatarWithProfile = await fetchAvatarProfiles([fetchedAvatarData], circlesSdkRunner);
        if (isStale()) {
          return;
        }
        setAvatarWithProfile(avatarWithProfile[0]);
      } else {
        setAvatarWithProfile(undefined);
      }

      const [balanceResult, trustResult] = await Promise.allSettled([
        circlesSdkRunner.data.getTokenBalances(address),
        circlesSdkRunner.data.getAggregatedTrustRelations(address),
      ]);
      if (isStale()) {
        return;
      }

      if (balanceResult.status === 'fulfilled') {
        setCirclesBalance(balanceResult.value);
      } else {
        if (!isNoBalancesRpcError(balanceResult.reason)) {
          console.warn('Failed to fetch balance:', balanceResult.reason);
        }
        setCirclesBalance([]);
      }

      if (trustResult.status === 'fulfilled') {
        setTrustConnections(trustResult.value);
      } else {
        console.warn('Failed to fetch trust connections:', trustResult.reason);
        setTrustConnections([]);
      }

    } catch (error) {
      if (isStale()) {
        return;
      }
      clearAccountScopedData();
      console.error('Error fetching avatar data:', error, address);
    } finally {
      if (!isStale()) {
        setIsLoadingAvatarData(false);
      }
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
            if (!profileData.previewImageUrl) {
              profileData.previewImageUrl = '/profile.svg';
            }
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
      const requestId = ++fetchRequestIdRef.current;
      fetchAvatarData(account.address as `0x${string}`, circlesSdkRunner, requestId);
    } else if (!account.isConnected || !account.address) {
      fetchRequestIdRef.current += 1;
      clearAccountScopedData();
      setIsLoadingAvatarData(false);
    }
  }, [account.isConnected, account.address, circlesSdkRunner]);

  const refreshData = async () => {
    if (account.isConnected && account.address && circlesSdkRunner) {
      const requestId = ++fetchRequestIdRef.current;
      await fetchAvatarData(account.address as `0x${string}`, circlesSdkRunner, requestId);
    }
  };

  const value = {
    circlesBalance,
    trustConnections,
    avatarWithProfile,
    isLoadingAvatarData,
    refreshData,
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
