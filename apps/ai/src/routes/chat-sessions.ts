import { Hono } from "hono";
import { stream } from "hono/streaming";
import { walletAuth } from "../middleware/auth";
import { balanceCheck } from "../middleware/balance-check";
import {
	createSessionForWallet,
	getSessionDetail,
	listSessionsForWallet,
	sendChatMessage,
} from "../services/chat";

type Variables = {
	walletAddress: string;
};

const chatSessions = new Hono<{ Variables: Variables }>();

chatSessions.get("/v1/chat/sessions", walletAuth, async (c) => {
	const walletAddress = c.get("walletAddress");
	const limit = Number.parseInt(c.req.query("limit") ?? "20", 10);
	const offset = Number.parseInt(c.req.query("offset") ?? "0", 10);

	const response = await listSessionsForWallet(walletAddress, {
		limit: Number.isNaN(limit) ? 20 : limit,
		offset: Number.isNaN(offset) ? 0 : offset,
	});

	return c.json(response);
});

chatSessions.post("/v1/chat/sessions", walletAuth, balanceCheck, async (c) => {
	const walletAddress = c.get("walletAddress");
	const body = (await c.req.json().catch(() => null)) as {
		title?: string | null;
		agent?: string;
		provider?: string;
		model?: string;
		projectPath?: string;
	} | null;

	if (!body) {
		return c.json(
			{ error: { message: "Invalid JSON body", type: "invalid_request" } },
			400,
		);
	}

	const { title, agent, provider, model, projectPath } = body;

	if (!agent || !provider || !model || !projectPath) {
		return c.json(
			{
				error: {
					message: "agent, provider, model, and projectPath are required",
					type: "invalid_request",
				},
			},
			400,
		);
	}

	const session = await createSessionForWallet(walletAddress, {
		title: title ?? null,
		agent,
		provider,
		model,
		projectPath,
	});

	return c.json({ session }, 201);
});

chatSessions.get("/v1/chat/sessions/:sessionId", walletAuth, async (c) => {
	const walletAddress = c.get("walletAddress");
	const sessionId = c.req.param("sessionId");
	const limit = c.req.query("limit");
	const offset = c.req.query("offset");

	try {
		const detail = await getSessionDetail(walletAddress, sessionId, {
			limit: limit != null ? Number.parseInt(limit, 10) : undefined,
			offset: offset != null ? Number.parseInt(offset, 10) : undefined,
		});

		return c.json(detail);
	} catch (error) {
		const status =
			typeof (error as any)?.status === "number" ? (error as any).status : 500;
		const message =
			error instanceof Error ? error.message : "Failed to fetch session";

		return c.json(
			{
				error: {
					message,
					type: status === 404 ? "not_found" : "server_error",
				},
			},
			status,
		);
	}
});

chatSessions.post(
	"/v1/chat/sessions/:sessionId/messages",
	walletAuth,
	balanceCheck,
	async (c) => {
		const walletAddress = c.get("walletAddress");
		const sessionId = c.req.param("sessionId");
		const body = (await c.req.json().catch(() => null)) as {
			content?: string;
			stream?: boolean;
		} | null;

		if (!body || typeof body.content !== "string" || !body.content.trim()) {
			return c.json(
				{
					error: {
						message: "content is required",
						type: "invalid_request",
					},
				},
				400,
			);
		}

		const isStream = Boolean(body.stream);

		try {
			const result = await sendChatMessage(
				walletAddress,
				sessionId,
				{
					content: body.content,
				},
				{ stream: isStream },
			);

			// Handle streaming response
			if ("type" in result && result.type === "stream") {
				return stream(c, async (writer) => {
					// Send initial user message
					await writer.writeln(
						`data: ${JSON.stringify({
							type: "userMessage",
							message: result.userMessage,
						})}`,
					);

					// Stream assistant response chunks
					try {
						for await (const chunk of result.stream) {
							await writer.writeln(
								`data: ${JSON.stringify({
									type: "chunk",
									content: chunk,
								})}`,
							);
						}

						// Finalize and send complete message
						const finalized = await result.finalize();
						await writer.writeln(
							`data: ${JSON.stringify({
								type: "complete",
								assistantMessage: finalized.assistantMessage,
								session: finalized.session,
							})}`,
						);
					} catch (streamError) {
						await writer.writeln(
							`data: ${JSON.stringify({
								type: "error",
								error:
									streamError instanceof Error
										? streamError.message
										: "Stream error",
							})}`,
						);
					}

					await writer.writeln("data: [DONE]");
				});
			}

			// Handle non-streaming response
			return c.json(result);
		} catch (error) {
			const status =
				typeof (error as any)?.status === "number"
					? (error as any).status
					: 500;
			const message =
				error instanceof Error ? error.message : "Failed to send message";

			const payload: Record<string, unknown> = {
				error: {
					message,
					type: status === 404 ? "not_found" : "server_error",
				},
			};

			if ((error as any)?.userMessage) {
				payload.userMessage = (error as any).userMessage;
			}
			if ((error as any)?.assistantMessage) {
				payload.assistantMessage = (error as any).assistantMessage;
			}

			return c.json(payload, status);
		}
	},
);

export default chatSessions;
