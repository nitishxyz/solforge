import { useCallback, useEffect, useMemo, useState } from "react";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import * as SecureStore from "expo-secure-store";

const WALLET_STORAGE_KEY = "solforge-chat-wallet-secret";
const WALLET_ACK_KEY = "solforge-chat-wallet-ack";

export interface GeneratedWallet {
    publicKey: string;
    secretKey: string;
    signNonce: (nonce: string) => string;
}

export interface UseWalletResult {
    wallet: GeneratedWallet | null;
    loading: boolean;
    needsBackup: boolean;
    acknowledgeBackup: () => void;
    regenerate: () => void;
}

async function loadStoredSecret(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(WALLET_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to load wallet secret", e);
        return null;
    }
}

async function loadAck(): Promise<boolean> {
    try {
        const val = await SecureStore.getItemAsync(WALLET_ACK_KEY);
        return val === "1";
    } catch (e) {
        return false;
    }
}

async function persistWallet(secret: string) {
    await SecureStore.setItemAsync(WALLET_STORAGE_KEY, secret);
}

async function persistAck(value: boolean) {
    await SecureStore.setItemAsync(WALLET_ACK_KEY, value ? "1" : "0");
}

function createWalletFromSecret(secret: string): GeneratedWallet {
    const secretBytes = bs58.decode(secret);
    const keypair = Keypair.fromSecretKey(secretBytes);

    return {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: secret,
        signNonce: (nonce: string) => {
            const messageBytes = new TextEncoder().encode(nonce);
            const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
            return bs58.encode(signature);
        },
    };
}

function generateWallet(): GeneratedWallet {
    const keypair = Keypair.generate();
    const secret = bs58.encode(keypair.secretKey);
    return {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: secret,
        signNonce: (nonce: string) => {
            const messageBytes = new TextEncoder().encode(nonce);
            const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
            return bs58.encode(signature);
        },
    };
}

export function useWallet(): UseWalletResult {
    const [wallet, setWallet] = useState<GeneratedWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsBackup, setNeedsBackup] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                const storedSecret = await loadStoredSecret();
                const hasAck = await loadAck();

                if (!mounted) return;

                if (storedSecret) {
                    setWallet(createWalletFromSecret(storedSecret));
                    setNeedsBackup(!hasAck);
                    return;
                }

                const generated = generateWallet();
                await persistWallet(generated.secretKey);

                if (!mounted) return;
                setWallet(generated);
                setNeedsBackup(true);
                await persistAck(false);
            } catch (e) {
                console.error("Wallet init error", e);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        init();

        return () => {
            mounted = false;
        };
    }, []);

    const acknowledgeBackup = useCallback(async () => {
        await persistAck(true);
        setNeedsBackup(false);
    }, []);

    const regenerate = useCallback(async () => {
        const generated = generateWallet();
        await persistWallet(generated.secretKey);
        await persistAck(false);
        setWallet(generated);
        setNeedsBackup(true);
    }, []);

    const result = useMemo<UseWalletResult>(
        () => ({ wallet, loading, needsBackup, acknowledgeBackup, regenerate }),
        [wallet, loading, needsBackup, acknowledgeBackup, regenerate],
    );

    return result;
}
