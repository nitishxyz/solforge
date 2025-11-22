import {
    CryptoDigestAlgorithm,
    digest as expoDigest,
    getRandomValues as expoGetRandomValues,
} from "expo-crypto";

type SupportedAlgorithm = "SHA-256" | "SHA-512";

function normalizeAlgorithm(algorithm: AlgorithmIdentifier): SupportedAlgorithm {
    const name = (typeof algorithm === "string" ? algorithm : algorithm.name).toUpperCase();
    if (name === "SHA-256" || name === "SHA-512") {
        return name;
    }
    throw new Error(`Unsupported algorithm: ${name}`);
}

function toUint8Array(data: BufferSource): Uint8Array {
    if (data instanceof Uint8Array) return data;
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return new Uint8Array(data);
}

async function digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
    const normalized = normalizeAlgorithm(algorithm);
    const expoAlgorithm =
        normalized === "SHA-256"
            ? CryptoDigestAlgorithm.SHA256
            : CryptoDigestAlgorithm.SHA512;

    const bytes = toUint8Array(data);
    return expoDigest(expoAlgorithm, bytes);
}

// Ensure global crypto exists (react-native-get-random-values should have created it)
const cryptoGlobal: any = globalThis.crypto ?? (globalThis as any).crypto ?? {};
if (!globalThis.crypto) {
    (globalThis as any).crypto = cryptoGlobal;
}

// Provide getRandomValues fallback via expo-crypto
if (typeof cryptoGlobal.getRandomValues !== "function") {
    cryptoGlobal.getRandomValues = expoGetRandomValues;
}

// Polyfill crypto.subtle
if (!cryptoGlobal.subtle || typeof cryptoGlobal.subtle.digest !== "function") {
    Object.defineProperty(cryptoGlobal, "subtle", {
        value: {
            digest,
            importKey: async () => {
                throw new Error("importKey not implemented in polyfill");
            },
            sign: async () => {
                throw new Error("sign not implemented in polyfill");
            },
            verify: async () => {
                throw new Error("verify not implemented in polyfill");
            },
        },
        writable: true,
    });
}
