export function parseSystemAccount(owner: string, space: number) {
	if (owner !== "11111111111111111111111111111111") return null;
	return { program: "system", parsed: { type: "account", info: {} }, space };
}
