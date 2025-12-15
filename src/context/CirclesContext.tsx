import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Profile } from '@circles-sdk/profiles';
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { useWallet } from './WalletContext';
import { Sdk } from "@circles-sdk/sdk";

// Invitation source types - indicates how the invitation was created
export type InvitationSource = 'trust' | 'escrow' | 'atScale';

// Unified invitation type that works with all sources
export interface InvitationWithProfile {
  address: `0x${string}`;
  source: InvitationSource;
  profile: Profile;
  // Trust-specific fields
  balance?: string;
  // Escrow-specific fields
  escrowedAmount?: string;
  escrowDays?: number;
  // At-scale-specific fields
  originInviter?: `0x${string}`;
  // Common fields
  blockNumber?: number;
  timestamp?: number;
}

export interface AvatarWithProfile {
  avatar: AvatarRow;
  profile: Profile;
}

interface CirclesContextType {
  circlesBalance: TokenBalanceRow[] | undefined;
  trustConnections: TrustRelationRow[] | undefined;
  profileError: string | null;
  avatarWithProfile: AvatarWithProfile | undefined;
  invitationsWithProfiles: InvitationWithProfile[] | undefined;
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
  const [invitationsWithProfiles, setInvitationsWithProfiles] = useState<InvitationWithProfile[] | undefined>();
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
        // Use getAllInvitations if available, otherwise fall back to getInvitations
        (circlesSdkRunner.data as any).getAllInvitations
          ? (circlesSdkRunner.data as any).getAllInvitations(address)
          : circlesSdkRunner.data.getInvitations(address)
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
        const invitationsWithProfiles = await fetchInvitationProfiles(invitationsData, circlesSdkRunner);
        setInvitationsWithProfiles(invitationsWithProfiles);
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

  // Fetch invitation profiles - handles both old (AvatarRow[]) and new (AllInvitationsResponse) formats
  const fetchInvitationProfiles = async (invitationsData: any, circlesSdkRunner: Sdk): Promise<InvitationWithProfile[]> => {
    const invitationsWithProfiles: InvitationWithProfile[] = [];

    // Check if this is the new AllInvitationsResponse format
    if (invitationsData && invitationsData.all) {
      // New format: AllInvitationsResponse with all, trustInvitations, escrowInvitations, atScaleInvitations
      for (const invitation of invitationsData.all) {
        let profile = fallbackProfile;

        // Try to get profile from avatarInfo.cidV0
        if (invitation.avatarInfo?.cidV0) {
          try {
            const profileData = await circlesSdkRunner.profiles?.get(invitation.avatarInfo.cidV0);
            if (profileData) {
              if (!profileData.previewImageUrl) {
                profileData.previewImageUrl = '/profile.svg';
              }
              profile = profileData;
            }
          } catch (error) {
            console.warn(`Failed to fetch profile for inviter ${invitation.address}, using fallback:`, error);
          }
        }

        // Use name from avatarInfo if profile doesn't have one
        if (profile === fallbackProfile && invitation.avatarInfo?.name) {
          profile = { ...fallbackProfile, name: invitation.avatarInfo.name };
        }

        const invitationWithProfile: InvitationWithProfile = {
          address: invitation.address as `0x${string}`,
          source: invitation.source,
          profile,
          balance: invitation.source === 'trust' ? invitation.balance : undefined,
          escrowedAmount: invitation.source === 'escrow' ? invitation.escrowedAmount : undefined,
          escrowDays: invitation.source === 'escrow' ? invitation.escrowDays : undefined,
          originInviter: invitation.source === 'atScale' ? invitation.originInviter : undefined,
          blockNumber: invitation.blockNumber,
          timestamp: invitation.timestamp,
        };

        invitationsWithProfiles.push(invitationWithProfile);
      }
    } else if (Array.isArray(invitationsData)) {
      // Old format: AvatarRow[] - treat all as trust-based invitations
      for (const avatar of invitationsData) {
        let profile = fallbackProfile;

        if (avatar.cidV0) {
          try {
            const profileData = await circlesSdkRunner.profiles?.get(avatar.cidV0);
            if (profileData) {
              if (!profileData.previewImageUrl) {
                profileData.previewImageUrl = '/profile.svg';
              }
              profile = profileData;
            }
          } catch (error) {
            console.warn(`Failed to fetch profile for avatar ${avatar.avatar}, using fallback:`, error);
          }
        }

        // Use name from avatar if profile doesn't have one
        if (profile === fallbackProfile && avatar.name) {
          profile = { ...fallbackProfile, name: avatar.name };
        }

        const invitationWithProfile: InvitationWithProfile = {
          address: avatar.avatar as `0x${string}`,
          source: 'trust', // Old format was always trust-based
          profile,
        };

        invitationsWithProfiles.push(invitationWithProfile);
      }
    }

    return invitationsWithProfiles;
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