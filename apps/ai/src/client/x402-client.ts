import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import type { KeyPairSigner } from "@solana/kit";
import { createSignerFromBase58 } from "x402/shared/svm";

export interface X402PaymentRequirement {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType?: string;
  maxTimeoutSeconds: number;
  extra?: {
    feePayer?: string;
  };
}

export interface X402PaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payload: {
    transaction: string;
  };
}

export interface WalletAdapter {
  publicKey: PublicKey;
  secretKey?: Uint8Array;
  signTransaction(tx: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
}

export class X402Client {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async createPaymentPayload(
    wallet: WalletAdapter,
    requirement: X402PaymentRequirement
  ): Promise<X402PaymentPayload> {
    if (!wallet.secretKey) {
      throw new Error("Wallet must expose secretKey for x402 payments");
    }

    // Use SDK to create proper KeyPairSigner from secret key
    const privateKeyBase58 = bs58.encode(wallet.secretKey);
    const signer = await createSignerFromBase58(privateKeyBase58);

    // Use Coinbase x402 SDK to create payment header
    const paymentHeader = await createPaymentHeader(
      signer,
      1, // x402Version
      requirement as unknown as PaymentRequirements,
      {
        svmConfig: {
          rpcUrl: this.connection.rpcEndpoint,
        },
      }
    );

    // Decode the payment header to get the payload
    const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));

    return {
      x402Version: 1,
      scheme: "exact",
      network: requirement.network,
      payload: {
        transaction: decoded.payload.transaction,
      },
    };
  }

  createAuthHeaders(
    walletAddress: string,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<Record<string, string>> {
    const nonce = Date.now().toString();
    const message = new TextEncoder().encode(nonce);

    return signMessage(message).then((signature) => ({
      "x-wallet-address": walletAddress,
      "x-wallet-signature": bs58.encode(signature),
      "x-wallet-nonce": nonce,
    }));
  }

  async makeAuthenticatedRequest(
    url: string,
    wallet: WalletAdapter,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    options: RequestInit = {}
  ): Promise<Response> {
    const authHeaders = await this.createAuthHeaders(
      wallet.publicKey.toBase58(),
      signMessage
    );

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...authHeaders,
      },
    });
  }

  async handlePaymentRequired(
    response: Response,
    wallet: WalletAdapter,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    originalUrl: string,
    originalOptions: RequestInit = {}
  ): Promise<Response> {
    if (response.status !== 402) {
      return response;
    }

    const body = (await response.clone().json()) as any;

    if (!body.x402Version || !body.accepts?.[0]) {
      throw new Error("Invalid 402 response - missing x402 payment info");
    }

    const availableRequirements = body.accepts as X402PaymentRequirement[];
    const requirementCandidate = selectPaymentRequirements(
      availableRequirements as unknown as PaymentRequirements[],
      undefined,
      "exact",
    ) as unknown as X402PaymentRequirement | undefined;

    if (!requirementCandidate) {
      throw new Error("No supported x402 payment requirements available");
    }

    const requirement = requirementCandidate;

    console.log("💳 Payment required:");
    console.log(
      `  Options: ${availableRequirements
        .map(
          (option, index) =>
            `${index + 1}. ${(parseInt(option.maxAmountRequired) / 1_000_000).toFixed(2)} USDC`,
        )
        .join(", ")}`,
    );

    console.log(
      `  Selected amount: ${(parseInt(requirement.maxAmountRequired) / 1_000_000).toFixed(2)} USDC`,
    );
    console.log(`  To: ${requirement.payTo}`);
    console.log(`  Reason: ${requirement.description}`);

    const paymentPayload = await this.createPaymentPayload(wallet, requirement);

    const authHeaders = await this.createAuthHeaders(
      wallet.publicKey.toBase58(),
      signMessage
    );

    const topupResponse = await fetch(
      originalUrl.replace(/\/v1\/chat\/completions.*/, "/v1/topup"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirement: requirement,
        }),
      }
    );

    if (!topupResponse.ok) {
      const error = await topupResponse.json();
      throw new Error(`Payment failed: ${JSON.stringify(error)}`);
    }

    const topupResult = (await topupResponse.json()) as any;
    console.log("✅ Payment successful!");
    console.log(`  Transaction: ${topupResult.transaction}`);
    console.log(`  New balance: $${topupResult.new_balance}`);
    if (topupResult.amount_usd) {
      console.log(`  Credited: $${topupResult.amount_usd}`);
    }

    return this.makeAuthenticatedRequest(
      originalUrl,
      wallet,
      signMessage,
      originalOptions
    );
  }
}

export async function signMessageWithKeypair(
  keypair: { secretKey: Uint8Array },
  message: Uint8Array
): Promise<Uint8Array> {
  return nacl.sign.detached(message, keypair.secretKey);
}
