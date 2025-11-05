import { useCallback, useEffect, useMemo, useState } from "react";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

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

function loadStoredSecret(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(WALLET_STORAGE_KEY);
}

function loadAck(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(WALLET_ACK_KEY) === "1";
}

function persistWallet(secret: string) {
  window.localStorage.setItem(WALLET_STORAGE_KEY, secret);
}

function persistAck(value: boolean) {
  window.localStorage.setItem(WALLET_ACK_KEY, value ? "1" : "0");
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
    if (typeof window === "undefined") {
      return;
    }

    setLoading(true);

    try {
      const storedSecret = loadStoredSecret();
      const hasAck = loadAck();

      if (storedSecret) {
        setWallet(createWalletFromSecret(storedSecret));
        setNeedsBackup(!hasAck);
        return;
      }

      const generated = generateWallet();
      persistWallet(generated.secretKey);
      setWallet(generated);
      setNeedsBackup(true);
      persistAck(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeBackup = useCallback(() => {
    persistAck(true);
    setNeedsBackup(false);
  }, []);

  const regenerate = useCallback(() => {
    const generated = generateWallet();
    persistWallet(generated.secretKey);
    persistAck(false);
    setWallet(generated);
    setNeedsBackup(true);
  }, []);

  const result = useMemo<UseWalletResult>(
    () => ({ wallet, loading, needsBackup, acknowledgeBackup, regenerate }),
    [wallet, loading, needsBackup, acknowledgeBackup, regenerate],
  );

  return result;
}
