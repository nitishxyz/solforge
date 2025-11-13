import bs58 from "bs58";
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  X402Client,
  signMessageWithKeypair,
  type WalletAdapter,
} from "../../src/client/x402-client";
import { Resource } from "sst";

const WALLET_PRIVATE_KEY =
  "4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";
const BASE_URL = process.env.AI_PROXY_URL ?? "http://localhost:4000";
const RPC_URL = Resource.SolanaRpcUrl.value ?? "https://api.devnet.solana.com";
const TARGET_TOPUP_AMOUNT_MICRO_USDC = "100000"; // $0.10

class SimpleWalletAdapter implements WalletAdapter {
  constructor(private readonly keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  get secretKey(): Uint8Array {
    return this.keypair.secretKey;
  }

  async signTransaction(
    tx: Transaction | VersionedTransaction,
  ): Promise<Transaction | VersionedTransaction> {
    if ("version" in tx) {
      tx.sign([this.keypair]);
      return tx;
    }
    tx.partialSign(this.keypair);
    return tx;
  }
}

const keypair = Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY));
export const wallet = new SimpleWalletAdapter(keypair);
export const walletPublicKey = wallet.publicKey.toBase58();
export const x402Client = new X402Client(RPC_URL);

const signMessage = (message: Uint8Array) =>
  signMessageWithKeypair(keypair, message);

export async function createAuthHeaders() {
  return x402Client.createAuthHeaders(wallet.publicKey.toBase58(), signMessage);
}

export interface SolforgeRequestOptions {
  url: string;
  init: RequestInit;
}

export interface AutoTopupResult {
  response: Response;
  attempts: number;
}

type TopupResult = {
  amount_usd: string;
  new_balance: string;
  transaction: string;
};

async function settlePayment(requirement: any): Promise<TopupResult> {
  const paymentPayload = await x402Client.createPaymentPayload(
    wallet,
    requirement,
  );

  const authHeaders = await createAuthHeaders();
  const topupResponse = await fetch(`${BASE_URL}/v1/topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirement: requirement,
    }),
  });

  if (!topupResponse.ok) {
    const errorText = await topupResponse.text();
    throw new Error(`Top-up failed (${topupResponse.status}): ${errorText}`);
  }

  return topupResponse.json() as Promise<TopupResult>;
}

export async function fetchWithAutoTopup(
  options: SolforgeRequestOptions,
  maxAttempts = 3,
): Promise<AutoTopupResult> {
  let attempts = 0;
  const { url } = options;
  let init = { ...options.init };

  while (attempts < maxAttempts) {
    const authHeaders = await createAuthHeaders();
    init = {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...authHeaders,
      },
    };

    const response = await fetch(url, init);

    if (response.status !== 402) {
      return { response, attempts };
    }

    attempts += 1;

    const body = (await response.json()) as any;
    const accepts = Array.isArray(body.accepts) ? body.accepts : [];
    const requirement =
      accepts.find(
        (option: any) =>
          option.scheme === "exact" &&
          option.maxAmountRequired === TARGET_TOPUP_AMOUNT_MICRO_USDC,
      ) ?? accepts.find((option: any) => option.scheme === "exact");

    if (!requirement) {
      throw new Error("No supported payment requirement returned by server");
    }

    const topupResult = await settlePayment(requirement);
    console.log(
      `✅ Top-up complete: +$${topupResult.amount_usd} (balance: $${topupResult.new_balance}) tx: ${topupResult.transaction}`,
    );
  }

  throw new Error("Unable to settle payment after multiple attempts");
}

export { BASE_URL };
