const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length);

export function encodeBase58(bytes: Uint8Array): string {
	let num = 0n;
	for (let i = 0; i < bytes.length; i++)
		num = num * 256n + BigInt(bytes[i] || 0);
	let encoded = "";
	while (num > 0n) {
		const remainder = num % BASE;
		num = num / BASE;
		encoded = ALPHABET[Number(remainder)] + encoded;
	}
	for (let i = 0; i < bytes.length && bytes[i] === 0; i++)
		encoded = `1${encoded}`;
	return encoded || "1";
}

export function decodeBase58(str: string): Uint8Array {
	let num = 0n;
	for (const char of str) {
		const index = ALPHABET.indexOf(char);
		if (index === -1) throw new Error("Invalid base58 character");
		num = num * BASE + BigInt(index);
	}
	const bytes: number[] = [];
	while (num > 0n) {
		bytes.unshift(Number(num % 256n));
		num = num / 256n;
	}
	for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.unshift(0);
	return new Uint8Array(bytes.length > 0 ? bytes : [0]);
}
