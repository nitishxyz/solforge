import * as p from "@clack/prompts";

const CANCEL_MESSAGE = "Setup cancelled";

export function cancelSetup(): never {
	p.cancel(CANCEL_MESSAGE);
	process.exit(0);
}

export function ensure<T>(value: T | symbol): T {
	if (p.isCancel(value)) cancelSetup();
	return value as T;
}

export function validatePort(value: string | number | undefined) {
	const num = Number(value);
	if (!Number.isInteger(num)) return "Port must be an integer";
	if (num < 1 || num > 65535) return "Port must be between 1 and 65535";
	return undefined;
}

export function validatePositiveNumber(value: string) {
	const num = Number(value);
	if (!Number.isFinite(num)) return "Enter a number";
	if (num <= 0) return "Enter a positive number";
	return undefined;
}

export function validatePubkey(value: string | undefined) {
	if (!value) return "Value is required";
	const trimmed = value.trim();
	if (trimmed.length < 32 || trimmed.length > 44)
		return "Expected base58 address";
	return undefined;
}

export async function collectCustomEntries(label: string) {
	const results: string[] = [];
	while (true) {
		const value = await p.text({
			message: `Enter ${label} (leave blank to finish)`,
		});
		if (p.isCancel(value)) cancelSetup();
		const trimmed = typeof value === "string" ? value.trim() : "";
		if (!trimmed) break;
		const error = validatePubkey(trimmed);
		if (error) {
			p.log.error(error);
			continue;
		}
		results.push(trimmed);
	}
	return results;
}
