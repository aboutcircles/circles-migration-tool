import { BatchRun, SdkContractRunner, TransactionRequest as SdkTransactionRequest, TransactionResponse as SdkTransactionResponse } from "@circles-sdk/adapter";
import { Address } from "@circles-sdk/utils";
import Safe from "@safe-global/protocol-kit";
import { BrowserProvider, Eip1193Provider, JsonRpcProvider, Provider } from "ethers";
import { Hex } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const RELAYER_TIMEOUT_MS = 180000;

type RelayExecutionDeps = {
  safe: Safe;
  provider: Provider;
};

type RelayApiResponse = {
  transactionHash?: string;
  error?: string;
};

async function relayViaBackend(
  chainId: number,
  to: Address,
  data: Hex,
  avatarAddress: Address,
): Promise<string> {
  const response = await fetch("/api/gelato-relay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      to,
      data,
      avatarAddress,
    }),
  });

  const payload = await response.json() as RelayApiResponse;
  if (!response.ok || !payload.transactionHash) {
    if (response.status === 429) {
      throw new Error("The relay service is temporarily busy. Please try again in a few minutes.");
    }
    throw new Error(payload.error ?? "Failed to relay sponsored transaction.");
  }

  return payload.transactionHash;
}

async function mapToSdkResponse(provider: Provider, txHash: string): Promise<SdkTransactionResponse> {
  const receipt = await provider.waitForTransaction(txHash, 1, RELAYER_TIMEOUT_MS);
  if (!receipt) {
    throw new Error("Timed out waiting for relayed transaction receipt");
  }

  const tx = await provider.getTransaction(txHash);
  const network = await provider.getNetwork();

  if (tx) {
    return {
      blockNumber: tx.blockNumber ?? receipt.blockNumber,
      blockHash: tx.blockHash ?? receipt.blockHash,
      index: tx.index ?? receipt.index,
      hash: tx.hash,
      type: tx.type ?? receipt.type ?? 2,
      to: (tx.to ?? receipt.to ?? ZERO_ADDRESS) as Address,
      from: (tx.from ?? receipt.from) as Address,
      gasLimit: tx.gasLimit ?? receipt.gasUsed,
      gasPrice: tx.gasPrice ?? receipt.gasPrice ?? 0n,
      data: tx.data ?? "0x",
      value: tx.value ?? 0n,
      chainId: Number(tx.chainId ?? network.chainId),
    };
  }

  return {
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    index: receipt.index,
    hash: receipt.hash,
    type: receipt.type ?? 2,
    to: (receipt.to ?? ZERO_ADDRESS) as Address,
    from: receipt.from as Address,
    gasLimit: receipt.gasUsed,
    gasPrice: receipt.gasPrice ?? 0n,
    data: "0x",
    value: 0n,
    chainId: Number(network.chainId),
  };
}

class GelatoSafeBatchRun implements BatchRun {
  private readonly transactions: SdkTransactionRequest[] = [];

  constructor(private readonly deps: RelayExecutionDeps) {}

  addTransaction(tx: SdkTransactionRequest): void {
    this.transactions.push(tx);
  }

  async getTxCalldata() {
    return this.deps.safe.createTransaction({
      transactions: this.transactions.map((tx) => ({
        to: tx.to,
        value: (tx.value ?? 0n).toString(),
        data: tx.data,
      })),
    });
  }

  async run(): Promise<SdkTransactionResponse> {
    const unsignedSafeTx = await this.getTxCalldata();
    const signedSafeTx = await this.deps.safe.signTransaction(unsignedSafeTx);

    const chainId = Number(await this.deps.safe.getChainId());
    const safeAddress = await this.deps.safe.getAddress();

    let target = safeAddress as Address;
    let data = (await this.deps.safe.getEncodedTransaction(signedSafeTx)) as Hex;

    if (!(await this.deps.safe.isSafeDeployed())) {
      const deploymentBatch = await this.deps.safe.wrapSafeTransactionIntoDeploymentBatch(signedSafeTx);
      target = deploymentBatch.to as Address;
      data = deploymentBatch.data as Hex;
    }

    const txHash = await relayViaBackend(chainId, target, data, safeAddress as Address);
    return mapToSdkResponse(this.deps.provider, txHash);
  }
}

abstract class GelatoSafeContractRunnerBase implements SdkContractRunner {
  address?: Address;
  protected safe?: Safe;
  abstract provider: Provider;

  abstract init(safeAddress: Address): Promise<void>;

  estimateGas = async (tx: SdkTransactionRequest) => this.provider.estimateGas(tx);
  call = async (tx: SdkTransactionRequest) => this.provider.call(tx);
  resolveName = async (name: string) => this.provider.resolveName(name);

  sendTransaction = async (tx: SdkTransactionRequest): Promise<SdkTransactionResponse> => {
    const batch = this.sendBatchTransaction();
    batch.addTransaction(tx);
    return batch.run();
  };

  sendBatchTransaction = (): BatchRun => {
    if (!this.safe) {
      throw new Error("Safe runner is not initialized");
    }

    return new GelatoSafeBatchRun({
      safe: this.safe,
      provider: this.provider,
    });
  };

  getSafe = (): Safe | undefined => this.safe;
}

export class GelatoSafeSdkPrivateKeyContractRunner extends GelatoSafeContractRunnerBase {
  provider: Provider;

  constructor(
    private readonly privateKey: string,
    private readonly rpcUrl: string,
  ) {
    super();
    this.provider = new JsonRpcProvider(this.rpcUrl);
  }

  async init(safeAddress: Address): Promise<void> {
    this.address = safeAddress;
    this.safe = await Safe.init({
      provider: this.rpcUrl,
      signer: this.privateKey,
      safeAddress,
    });
  }
}

export class GelatoSafeSdkBrowserContractRunner extends GelatoSafeContractRunnerBase {
  provider: Provider;
  readonly browserProvider: BrowserProvider;
  readonly eip1193Provider: Eip1193Provider;

  constructor() {
    super();

    const injectedProvider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!injectedProvider) {
      throw new Error("No provider found on window.ethereum");
    }

    this.eip1193Provider = injectedProvider;
    this.browserProvider = new BrowserProvider(injectedProvider);
    this.provider = this.browserProvider;
  }

  async init(safeAddress: Address): Promise<void> {
    this.address = safeAddress;
    this.safe = await Safe.init({
      provider: {
        request: this.eip1193Provider.request.bind(this.eip1193Provider),
      },
      safeAddress,
    });
  }
}
