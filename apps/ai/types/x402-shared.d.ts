declare module "x402/shared/svm" {
  import type { KeyPairSigner } from "@solana/kit";

  export function createSignerFromBase58(
    privateKey: string,
  ): Promise<KeyPairSigner>;
}
