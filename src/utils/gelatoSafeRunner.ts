import { BatchRun, SdkContractRunner, TransactionRequest as SdkTransactionRequest, TransactionResponse as SdkTransactionResponse } from "@circles-sdk/adapter";
import { Address } from "@circles-sdk/utils";
import { createGelatoEvmRelayerClient, GelatoEvmRelayerClient } from "@gelatocloud/gasless";
import Safe from "@safe-global/protocol-kit";
import { BrowserProvider, Eip1193Provider, JsonRpcProvider, Provider } from "ethers";
import { Hex } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const RELAYER_TIMEOUT_MS = 180000;

type RelayExecutionDeps = {
  safe: Safe;
  relayerClient: GelatoEvmRelayerClient;
  provider: Provider;
};

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
        value: tx.value.toString(),
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

    const receipt = await this.deps.relayerClient.sendTransactionSync(
      {
        chainId,
        to: target,
        data,
      },
      {
        timeout: RELAYER_TIMEOUT_MS,
        throwOnReverted: true,
      }
    );

    return mapToSdkResponse(this.deps.provider, receipt.transactionHash);
  }
}

abstract class GelatoSafeContractRunnerBase implements SdkContractRunner {
  address?: Address;
  protected safe?: Safe;
  protected relayerClient?: GelatoEvmRelayerClient;
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
    if (!this.safe || !this.relayerClient) {
      throw new Error("Safe runner is not initialized");
    }

    return new GelatoSafeBatchRun({
      safe: this.safe,
      relayerClient: this.relayerClient,
      provider: this.provider,
    });
  };

  protected initializeRelayerClient(apiKey: string | undefined): void {
    if (!apiKey) {
      throw new Error("Missing VITE_GELATO_RELAY_API_KEY for sponsored transactions");
    }

    this.relayerClient = createGelatoEvmRelayerClient({
      apiKey,
    });
  }
}

export class GelatoSafeSdkPrivateKeyContractRunner extends GelatoSafeContractRunnerBase {
  provider: Provider;

  constructor(
    private readonly privateKey: string,
    private readonly rpcUrl: string,
    private readonly gelatoApiKey?: string,
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
    this.initializeRelayerClient(this.gelatoApiKey);
  }
}

export class GelatoSafeSdkBrowserContractRunner extends GelatoSafeContractRunnerBase {
  provider: Provider;
  readonly browserProvider: BrowserProvider;
  readonly eip1193Provider: Eip1193Provider;

  constructor(private readonly gelatoApiKey?: string) {
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
    this.initializeRelayerClient(this.gelatoApiKey);
  }
}
