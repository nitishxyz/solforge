interface ApiError {
	error?: string;
	details?: unknown;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers ?? {});
	if (!headers.has("content-type") && init.body)
		headers.set("content-type", "application/json");
	const response = await fetch(path, { ...init, headers });
	let payload: unknown = null;
	const text = await response.text();
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch (error) {
			throw new Error(
				`Failed to parse response from ${path}: ${String(error)}`,
			);
		}
	}
	if (!response.ok) {
		const errPayload = payload as ApiError | null;
		const message =
			errPayload?.error || response.statusText || "Request failed";
		throw new Error(message);
	}
	return payload as T;
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body: unknown) =>
		request<T>(path, {
			method: "POST",
			body: JSON.stringify(body),
		}),
};
