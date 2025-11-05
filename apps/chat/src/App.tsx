import { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	Copy,
	Key,
	Loader2,
	RotateCcw,
} from "lucide-react";
import { Sidebar } from "./components/sidebar";
import { ChatThread } from "./components/chat-thread";
import { ChatClient } from "./lib/api";
import { useChat } from "./hooks/use-chat";
import { useWallet } from "./hooks/use-wallet";

const DEFAULT_AGENT = import.meta.env.VITE_CHAT_AGENT ?? "solforge";
const DEFAULT_PROVIDER = import.meta.env.VITE_CHAT_PROVIDER ?? "openai";
const DEFAULT_MODEL = import.meta.env.VITE_CHAT_MODEL ?? "gpt-4o-mini";
const DEFAULT_PROJECT_PATH =
	import.meta.env.VITE_CHAT_PROJECT_PATH ?? "workspace";

function App() {
	const baseUrl = import.meta.env.VITE_AI_BASE_URL as string | undefined;
	const {
		wallet,
		loading: walletLoading,
		needsBackup,
		acknowledgeBackup,
		regenerate,
	} = useWallet();

	const client = useMemo(() => {
		if (!wallet) {
			return null;
		}
		return new ChatClient({
			baseUrl,
			wallet: {
				publicKey: wallet.publicKey,
				secretKey: wallet.secretKey,
				signNonce: wallet.signNonce,
			},
		});
	}, [baseUrl, wallet]);

	const {
		sessions,
		activeSession,
		messages,
		selectedSessionId,
		loadingSessions,
		loadingThread,
		sending,
		error,
		selectSession,
		createSession,
		sendMessage,
		setError,
	} = useChat({ client });

	const [creating, setCreating] = useState(false);
	const [copiedPub, setCopiedPub] = useState(false);
	const [copiedPriv, setCopiedPriv] = useState(false);
	const isWalletReady = Boolean(wallet) && !walletLoading;

	useEffect(() => {
		setCopiedPub(false);
		setCopiedPriv(false);
	}, [wallet?.publicKey]);

	async function handleCreateSession() {
		setCreating(true);
		try {
			await createSession({
				title: `Thread ${new Date().toLocaleTimeString()}`,
				agent: DEFAULT_AGENT,
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				projectPath: DEFAULT_PROJECT_PATH,
			});
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		} finally {
			setCreating(false);
		}
	}

	async function handleSendMessage(content: string) {
		try {
			await sendMessage(content);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		}
	}

	async function handleCopy(text: string, kind: "pub" | "priv") {
		try {
			await navigator.clipboard.writeText(text);
			if (kind === "pub") {
				setCopiedPub(true);
				setTimeout(() => setCopiedPub(false), 2000);
			} else {
				setCopiedPriv(true);
				setTimeout(() => setCopiedPriv(false), 2000);
			}
		} catch (error) {
			console.error("Failed to copy", error);
		}
	}

	const pubkeyLabel = wallet
		? `${wallet.publicKey.slice(0, 4)}…${wallet.publicKey.slice(-4)}`
		: "";

	return (
		<div className="flex h-screen w-full bg-background text-foreground">
			<Sidebar
				sessions={sessions}
				selectedSessionId={selectedSessionId}
				onSelect={selectSession}
				onCreate={handleCreateSession}
				loading={loadingSessions || !isWalletReady}
				creating={creating || !isWalletReady}
			/>

			<ChatThread
				session={activeSession}
				messages={messages}
				loading={loadingThread || !isWalletReady}
				sending={sending || !isWalletReady}
				onSend={handleSendMessage}
			/>

			{wallet ? (
				<div className="pointer-events-auto fixed right-6 top-6 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
					<span className="text-[11px] font-semibold text-muted-foreground">
						Wallet
					</span>
					<button
						type="button"
						onClick={() => void handleCopy(wallet.publicKey, "pub")}
						className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground transition hover:bg-accent"
					>
						<span className="font-mono text-[11px]">{pubkeyLabel}</span>
						{copiedPub ? (
							<Check className="h-3 w-3" />
						) : (
							<Copy className="h-3 w-3" />
						)}
					</button>
					<button
						type="button"
						onClick={() => regenerate()}
						className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground transition hover:bg-accent"
						title="Generate a new wallet"
					>
						<RotateCcw className="h-3 w-3" />
					</button>
				</div>
			) : null}

			{walletLoading && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 text-sm text-muted-foreground">
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Preparing wallet…
				</div>
			)}

			{wallet && needsBackup ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
					<div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl">
						<div className="flex items-center gap-2 text-base font-semibold text-foreground">
							<Key className="h-5 w-5" />
							New Wallet Created
						</div>
						<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
							Copy this private key and store it securely. It will only be shown
							once. This wallet will be used to sign requests and needs funds to
							chat.
						</p>
						<div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
							<p className="text-xs font-semibold text-muted-foreground mb-2">
								Private Key
							</p>
							<div className="flex items-start gap-2">
								<code className="block flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-background border border-border px-3 py-2 text-xs text-foreground font-mono">
									{wallet.secretKey}
								</code>
								<button
									type="button"
									onClick={() => void handleCopy(wallet.secretKey, "priv")}
									className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
								>
									{copiedPriv ? (
										<Check className="h-3 w-3" />
									) : (
										<Copy className="h-3 w-3" />
									)}
									Copy
								</button>
							</div>
						</div>
						<div className="mt-4 text-xs text-muted-foreground">
							<span className="font-medium">Funding address:</span>{" "}
							{wallet.publicKey}
						</div>
						<div className="mt-6 flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => regenerate()}
								className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
							>
								Generate Again
							</button>
							<button
								type="button"
								onClick={() => acknowledgeBackup()}
								className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
							>
								I Saved It
							</button>
						</div>
					</div>
				</div>
			) : null}

			{error ? (
				<div className="pointer-events-auto fixed bottom-6 right-6 flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm shadow-lg max-w-md">
					<AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
					<span className="flex-1 text-left text-foreground">{error}</span>
					<button
						type="button"
						onClick={() => setError(null)}
						className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
					>
						Dismiss
					</button>
				</div>
			) : null}
		</div>
	);
}

export default App;
