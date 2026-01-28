import { Address, createPublicClient, http, parseEther } from "viem";
import { gnosis } from "viem/chains";

const MINIMUM_BALANCE = parseEther("0.01");
const SERVERLESS_FUNCTION_URL = import.meta.env.VITE_FUNDING_SERVICE_URL || "";

export async function checkEoaBalance(eoaAddress: Address): Promise<boolean> {
  const publicClient = createPublicClient({
    chain: gnosis,
    transport: http("https://rpc.aboutcircles.com"),
  });

  const balance = await publicClient.getBalance({
    address: eoaAddress,
  });

  return balance >= MINIMUM_BALANCE;
}


export async function requestFunding(
  eoaAddress: Address,
  safeAddress: Address | undefined
): Promise<void> {
  if (!SERVERLESS_FUNCTION_URL) {
    throw new Error(
      "Funding service URL not configured. Please set VITE_FUNDING_SERVICE_URL environment variable."
    );
  }

  try {
    const response = await fetch(SERVERLESS_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eoaAddress,
        safeAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`Funding request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Funding request successful:", data);
  } catch (error) {
    console.error("Error requesting funding:", error);
    throw error;
  }
}
