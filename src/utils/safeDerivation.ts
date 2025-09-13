import { Address } from 'viem';

const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
  `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

export async function findSafeFromSigner(signerAddress: Address): Promise<Address | null> {
  try {
    
    const response = await fetch(getSafesByOwnerApiEndpoint(signerAddress));
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const safes = data.safes as Address[];

    if (safes.length > 0) {
      return safes[0];
    }
    
    console.log('No Safes found for signer:', signerAddress);
    return null;
  } catch (error) {
    console.error('Error finding Safe from signer:', error);
    return null;
  }
}
