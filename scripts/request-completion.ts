import bs58 from "bs58";
import nacl from "tweetnacl";

const WALLET_PRIVATE_KEY =
	"4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";
const WALLET_PUBLIC_KEY = "HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw";
const BASE_URL = process.env.AI_PROXY_URL ?? "https://ai.solforge.sh";

function signNonce(nonce: string): string {
	const secretKey = bs58.decode(WALLET_PRIVATE_KEY);
	const message = new TextEncoder().encode(nonce);
	const signature = nacl.sign.detached(message, secretKey);
	return bs58.encode(signature);
}

async function requestCompletion(prompt: string, stream = false) {
	const nonce = Date.now().toString();
	const signature = signNonce(nonce);

	const response = await fetch(`${BASE_URL}/v1/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-wallet-address": WALLET_PUBLIC_KEY,
			"x-wallet-signature": signature,
			"x-wallet-nonce": nonce,
		},
		body: JSON.stringify({
			model: "gpt-4o-mini",
			prompt,
			max_tokens: 256,
			stream,
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		console.error(`Request failed (${response.status}):`, errText);
		process.exit(1);
	}

	if (stream) {
		const reader = response.body?.getReader();
		if (!reader) {
			console.error("Streaming response missing body reader");
			process.exit(1);
		}
		const decoder = new TextDecoder();
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			process.stdout.write(decoder.decode(value));
		}
		return;
	}

	const json = await response.json();
	console.log(JSON.stringify(json, null, 2));
}

const [, , ...args] = Bun.argv;
if (!args[0]) {
	console.error(
		"Usage: bun run scripts/request-completion.ts <prompt> [--stream]",
	);
	process.exit(1);
}

const prompt = args[0];
const stream = args.includes("--stream");

await requestCompletion(prompt, stream);
