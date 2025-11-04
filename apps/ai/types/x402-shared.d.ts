declare module "x402/shared" {
  import type { KeyPairSigner } from "@solana/kit";

  export const svm: {
    createSignerFromBase58(privateKey: string): Promise<KeyPairSigner>;
  };
}
