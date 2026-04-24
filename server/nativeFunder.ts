import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gnosis } from "viem/chains";

export interface NativeFunder {
  getBalance(address: Address): Promise<bigint>;
  send(to: Address, amountWei: bigint): Promise<Hex>;
}

export class ViemNativeFunder implements NativeFunder {
  private readonly walletClient;
  private readonly publicClient;

  constructor(privateKey: Hex, rpcUrl: string) {
    const transport = http(rpcUrl);
    this.publicClient = createPublicClient({
      chain: gnosis,
      transport,
    });
    this.walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: gnosis,
      transport,
    });
  }

  async send(to: Address, amountWei: bigint): Promise<Hex> {
    return this.walletClient.sendTransaction({
      to,
      value: amountWei,
    });
  }

  async getBalance(address: Address): Promise<bigint> {
    return this.publicClient.getBalance({ address });
  }
}
