declare module "tweetnacl" {
  export const sign: {
    detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    detached: {
      (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
      verify(
        message: Uint8Array,
        signature: Uint8Array,
        publicKey: Uint8Array,
      ): boolean;
    };
  };
  const nacl: {
    sign: typeof sign;
  };
  export default nacl;
}
