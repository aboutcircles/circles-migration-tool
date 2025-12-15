import { InvitationWithProfile } from '../context/CirclesContext';

/**
 * Mock invitation data for testing UI with all 3 invitation types
 * Set USE_MOCK_INVITATIONS to true in CirclesContext.tsx to use this data
 */
export const MOCK_INVITATIONS: InvitationWithProfile[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    source: 'trust',
    profile: { name: 'Alice (Trust)', previewImageUrl: '/profile.svg' },
    balance: '150.5',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    source: 'escrow',
    profile: { name: 'Bob (Escrow)', previewImageUrl: '/profile.svg' },
    escrowedAmount: '48000000000000000000', // 48 CRC in atto
    escrowDays: 5,
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    source: 'atScale',
    profile: { name: 'Circles Bot (Referral)', previewImageUrl: '/profile.svg' },
    blockNumber: 12345678,
    timestamp: Date.now() / 1000,
  },
];
