import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import type { TokenSummary } from "../api";

interface Props {
	tokens: TokenSummary[];
	onAirdrop: (address: string, lamports: string) => Promise<string | void>;
	onMint: (
		mint: string,
		owner: string,
		amountRaw: string,
	) => Promise<string | void>;
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
			const signature = await onAirdrop(canonicalRecipient, lamports);
			return signature
				? `Airdrop signature: ${signature}`
				: "Airdrop submitted";
		}
		const raw = toBaseUnits(amount, selected.decimals);
		const signature = await onMint(asset, canonicalRecipient, raw);
		return signature ? `Mint signature: ${signature}` : "Mint submitted";
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPending(true);
		setError(null);
		setMessage(null);
		try {
			const note = await submit();
			setMessage(note);
		} catch (err: any) {
			setError(err?.message ?? String(err));
		} finally {
			setPending(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
						<i className="fas fa-paper-plane text-violet-400"></i>
					</div>
					<div>
						<h2 className="text-xl font-bold text-white">Quick Actions</h2>
						<p className="text-xs text-gray-500">Airdrop SOL or mint tokens</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="badge badge-info">
						<i className="fas fa-bolt text-xs"></i>
						<span>Faucet Powered</span>
					</span>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="space-y-2">
					<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
						Recipient Address
					</label>
					<div className="relative">
						<input
							value={recipient}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setRecipient(event.target.value)
							}
							placeholder="Enter Solana public key"
							className="input pl-10"
						/>
						<i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
						Asset
					</label>
					<div className="relative">
						<select
							value={asset}
							onChange={(event: ChangeEvent<HTMLSelectElement>) =>
								setAsset(event.target.value)
							}
							className="select pl-10 appearance-none"
						>
							{options.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<i className="fas fa-coins absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
						Amount
					</label>
					<div className="relative">
						<input
							value={amount}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setAmount(event.target.value)
							}
							placeholder="1.0"
							inputMode="decimal"
							className="input pl-10"
						/>
						<i className="fas fa-calculator absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
					<p className="text-xs text-gray-500">
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
					className={`btn-primary flex-1 sm:flex-initial ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
				>
					{pending ? (
						<>
							<div className="spinner"></div>
							<span>Processing</span>
						</>
					) : (
						<>
							<i
								className={`fas fa-${asset === SOL_OPTION.value ? "parachute-box" : "coins"}`}
							></i>
							<span>
								{asset === SOL_OPTION.value ? "Airdrop SOL" : "Mint Tokens"}
							</span>
						</>
					)}
				</button>

				{error && (
					<div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
						<i className="fas fa-exclamation-circle text-red-400"></i>
						<p className="text-sm text-red-300">{error}</p>
					</div>
				)}

				{message && (
					<div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
						<i className="fas fa-check-circle text-green-400"></i>
						<p className="text-sm text-green-300 font-mono text-xs break-all">
							{message}
						</p>
					</div>
				)}
			</div>
		</form>
	);
}
