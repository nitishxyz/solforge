import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { createPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import { svm } from "x402/shared";
import nacl from "tweetnacl";

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
    signTransaction(
        tx: Transaction | VersionedTransaction,
    ): Promise<Transaction | VersionedTransaction>;
}

export class X402Client {
    private connection: Connection;

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl, "confirmed");
    }

    async createPaymentPayload(
        wallet: WalletAdapter,
        requirement: X402PaymentRequirement,
    ): Promise<X402PaymentPayload> {
        if (!wallet.secretKey) {
            throw new Error("Wallet must expose secretKey for x402 payments");
        }

        // Use SDK to create proper KeyPairSigner from secret key
        const privateKeyBase58 = bs58.encode(wallet.secretKey);

        // Custom signer to avoid crypto.subtle.importKey issue in React Native
        // Implements TransactionPartialSigner from @solana/web3.js v2 (used by x402)
        const keypair = Keypair.fromSecretKey(wallet.secretKey);
        const signer = {
            address: keypair.publicKey.toString(),
            signTransactions: async (transactions: any[]) => {
                return transactions.map((tx) => {
                    // Sign the message bytes using tweetnacl
                    const signature = nacl.sign.detached(tx.messageBytes, keypair.secretKey);
                    // Return SignatureDictionary: { [address]: signature }
                    return { [keypair.publicKey.toString()]: signature };
                });
            }
        };

        // Use Coinbase x402 SDK to create payment header
        const paymentHeader = await createPaymentHeader(
            signer as any, // Cast to any to satisfy x402 types if needed
            1, // x402Version
            requirement as unknown as PaymentRequirements,
            {
                svmConfig: {
                    rpcUrl: this.connection.rpcEndpoint,
                },
            },
        );

        // Decode the payment header to get the payload
        const decoded = JSON.parse(atob(paymentHeader));

        return {
            x402Version: 1,
            scheme: "exact",
            network: requirement.network,
            payload: {
                transaction: decoded.payload.transaction,
            },
        };
    }
}

export function signMessageWithKeypair(
    keypair: Keypair,
    message: Uint8Array,
): Uint8Array {
    return nacl.sign.detached(message, keypair.secretKey);
}
