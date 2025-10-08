import {
	type ChangeEvent,
	type FormEvent,
	useId,
	useMemo,
	useState,
} from "react";
import type { TokenSummary } from "../api/types";

interface Props {
	tokens: TokenSummary[];
	onAirdrop: (address: string, lamports: string) => Promise<void>;
	onMint: (mint: string, owner: string, amountRaw: string) => Promise<void>;
}

const SOL_OPTION = {
	value: "SOL",
	label: "SOL (Lamports)",
	decimals: 9,
} as const;

const BIGINT_TEN = 10n;

function toBaseUnits(rawInput: string, decimals: number) {
	const input = rawInput.trim();
	if (!input) throw new Error("Amount is required");
	const negative = input.startsWith("-");
	if (negative) throw new Error("Amount must be positive");
	const [wholeRaw = "0", fracRaw = ""] = input.split(".");
	const whole = wholeRaw.replace(/[^0-9]/g, "") || "0";
	const fracClean = fracRaw.replace(/[^0-9]/g, "");
	if (fracClean.length > decimals)
		throw new Error(`Too many decimal places (max ${decimals})`);
	const scale = BIGINT_TEN ** BigInt(decimals);
	const wholeValue = BigInt(whole);
	const fracPadded = decimals === 0 ? "0" : fracClean.padEnd(decimals, "0");
	const fracValue = BigInt(fracPadded || "0");
	const total = wholeValue * scale + fracValue;
	if (total <= 0n) throw new Error("Amount must be greater than zero");
	return total.toString();
}

function formatTokenLabel(token: TokenSummary) {
	const suffix = token.mintAuthority
		? `Authority ${token.mintAuthority.slice(0, 6)}…`
		: "No authority";
	return `${token.mint.slice(0, 6)}…${token.mint.slice(-4)} · ${token.decimals} dec · ${suffix}`;
}

export function AirdropMintForm({ tokens, onAirdrop, onMint }: Props) {
	const [asset, setAsset] = useState<string>(SOL_OPTION.value);
	const [recipient, setRecipient] = useState<string>("");
	const [amount, setAmount] = useState<string>("1");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const uid = useId();
	const recipientId = `${uid}-recipient`;
	const assetId = `${uid}-asset`;
	const amountId = `${uid}-amount`;

	const options = useMemo(() => {
		const tokenOpts = tokens.map((token) => ({
			value: token.mint,
			label: formatTokenLabel(token),
			decimals: token.decimals,
		}));
		return [SOL_OPTION, ...tokenOpts];
	}, [tokens]);

	const selected = options.find((opt) => opt.value === asset) ?? SOL_OPTION;

	const submit = async () => {
		if (!recipient.trim()) throw new Error("Recipient address is required");
		const canonicalRecipient = recipient.trim();
		if (asset === SOL_OPTION.value) {
			const lamports = toBaseUnits(amount, SOL_OPTION.decimals);
			await onAirdrop(canonicalRecipient, lamports);
			return "Airdrop submitted successfully";
		}
		const raw = toBaseUnits(amount, selected.decimals);
		await onMint(asset, canonicalRecipient, raw);
		return "Mint submitted successfully";
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPending(true);
		setError(null);
		setMessage(null);
		try {
			const note = await submit();
			setMessage(note);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setError(message);
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-lg border border-border bg-card text-card-foreground p-6"
		>
			<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-violet-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
							/>
						</svg>
					</div>
					<div>
						<h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
						<p className="text-xs text-muted-foreground">
							Airdrop SOL or mint tokens
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="space-y-2">
					<label
						htmlFor={recipientId}
						className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
					>
						Recipient Address
					</label>
					<input
						id={recipientId}
						value={recipient}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setRecipient(event.target.value)
						}
						placeholder="Enter Solana public key"
						className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
					/>
				</div>

				<div className="space-y-2">
					<label
						htmlFor={assetId}
						className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
					>
						Asset
					</label>
					<select
						id={assetId}
						value={asset}
						onChange={(event: ChangeEvent<HTMLSelectElement>) =>
							setAsset(event.target.value)
						}
						className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
					>
						{options.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-2">
					<label
						htmlFor={amountId}
						className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
					>
						Amount
					</label>
					<input
						id={amountId}
						value={amount}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setAmount(event.target.value)
						}
						placeholder="1.0"
						inputMode="decimal"
						className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
					/>
					<p className="text-xs text-muted-foreground">
						{asset === SOL_OPTION.value
							? "In SOL (9 decimals)"
							: `In tokens (${selected.decimals} decimals)`}
					</p>
				</div>
			</div>

			<div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
				<button
					type="submit"
					disabled={pending}
					className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
				>
					{pending ? (
						<>
							<svg
								className="animate-spin w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<span>Processing</span>
						</>
					) : (
						<span>
							{asset === SOL_OPTION.value ? "Airdrop SOL" : "Mint Tokens"}
						</span>
					)}
				</button>

				{error && (
					<div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
						<svg
							className="w-5 h-5 text-red-400 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p className="text-sm text-red-300">{error}</p>
					</div>
				)}

				{message && (
					<div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
						<svg
							className="w-5 h-5 text-green-400 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p className="text-sm text-green-300">{message}</p>
					</div>
				)}
			</div>
		</form>
	);
}
