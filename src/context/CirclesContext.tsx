import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Profile } from '@circles-sdk/profiles';
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';
import { Sdk } from "@circles-sdk/sdk";
import { Address } from "viem";
import { validateHumanRegistrationWithInviter } from "../utils/invitationValidation";
import { isNoBalancesRpcError } from "../utils/migrationFallback";

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
  invitationValidationError: string | null;
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarWithProfile, setAvatarWithProfile] = useState<AvatarWithProfile | undefined>();
  const [isLoadingAvatarData, setIsLoadingAvatarData] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [invitationValidationError, setInvitationValidationError] = useState<string | null>(null);
  const [invitationsWithProfiles, setInvitationsWithProfiles] = useState<AvatarWithProfile[] | undefined>();
  const { account, circlesSdkRunner } = useWallet();
  const fetchRequestIdRef = useRef(0);

  const filterValidInvitations = async (
    avatarAddress: Address,
    invitations: AvatarRow[],
    sdk: Sdk
  ) => {
    const validationResults = await Promise.all(
      invitations.map(async (invitation) => {
        const result = await validateHumanRegistrationWithInviter(
          sdk,
          avatarAddress,
          invitation.avatar as Address
        );

        return {
          invitation,
          ...result,
        };
      })
    );

    return {
      validInvitations: validationResults
        .filter((result) => result.isValid)
        .map((result) => result.invitation),
      invalidReasons: validationResults
        .filter((result) => !result.isValid)
        .map((result) => result.reason)
        .filter((reason): reason is string => Boolean(reason)),
    };
  };

  const clearAccountScopedData = () => {
    setAvatarWithProfile(undefined);
    setCirclesBalance(undefined);
    setTrustConnections(undefined);
    setInvitationsWithProfiles(undefined);
    setProfileError(null);
    setInvitationValidationError(null);
  };

  const fetchAvatarData = async (address: `0x${string}`, circlesSdkRunner: Sdk, requestId: number) => {
    const isStale = () => requestId !== fetchRequestIdRef.current;

    if (isStale()) {
      return;
    }

    setIsLoadingAvatarData(true);
    setAvatarError(null);
    setInvitationValidationError(null);

    try {
      const fetchedAvatarData = await circlesSdkRunner.data.getAvatarInfo(address);
      if (isStale()) {
        return;
      }
      const shouldFetchInvitations =
        fetchedAvatarData?.type === "CrcV1_Signup" && fetchedAvatarData.version !== 2;

      if (fetchedAvatarData) {
        const avatarWithProfile = await fetchAvatarProfiles([fetchedAvatarData], circlesSdkRunner);
        if (isStale()) {
          return;
        }
        setAvatarWithProfile(avatarWithProfile[0]);
      } else {
        setAvatarWithProfile(undefined);
      }

      const [balanceResult, trustResult, invitationsResult] = await Promise.allSettled([
        circlesSdkRunner.data.getTokenBalances(address),
        circlesSdkRunner.data.getAggregatedTrustRelations(address),
        shouldFetchInvitations ? circlesSdkRunner.data.getInvitations(address) : Promise.resolve([])
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

      if (invitationsResult.status === 'fulfilled') {
        const invitationsData = invitationsResult.value;
        const filteredInvitations = shouldFetchInvitations
          ? await filterValidInvitations(address, invitationsData, circlesSdkRunner)
          : { validInvitations: [], invalidReasons: [] as string[] };
        const avatarsWithProfiles = await fetchAvatarProfiles(filteredInvitations.validInvitations, circlesSdkRunner);
        setInvitationsWithProfiles(avatarsWithProfiles);

        if (
          shouldFetchInvitations &&
          invitationsData.length > 0 &&
          filteredInvitations.validInvitations.length === 0
        ) {
          const firstReason = filteredInvitations.invalidReasons[0];
          setInvitationValidationError(
            firstReason
              ? `Your invitation cannot be used right now. Please request a fresh invite and try again.`
              : "Your invitation cannot be used right now. Please request a fresh invite and try again."
          );
        }
      } else {
        console.warn('Failed to fetch invitations:', invitationsResult.reason);
        setInvitationsWithProfiles([]);
      }

    } catch (error) {
      if (isStale()) {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch avatar data';
      setAvatarError(errorMessage);
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
      setAvatarError(null);
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
    profileError,
    avatarWithProfile,
    invitationsWithProfiles,
    isLoadingAvatarData,
    avatarError,
    invitationValidationError,
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
