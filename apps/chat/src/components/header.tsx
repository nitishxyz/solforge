import { Check, Copy, Wallet, RotateCcw, Loader2 } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
	walletAddress: string;
	solforgeBalance: string | null;
	walletBalance: string | null;
	loadingBalance: boolean;
	onRegenerateWallet: () => void;
}

export function Header({
	walletAddress,
	solforgeBalance,
	walletBalance,
	loadingBalance,
	onRegenerateWallet,
}: HeaderProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(walletAddress);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy", error);
		}
	};

	const pubkeyLabel = `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;

	return (
		<header className="h-14 border-b border-border bg-background px-4 flex items-center justify-between relative z-30">
			<div className="flex items-center gap-2">
				<h1 className="text-lg font-semibold text-foreground">SolForge Chat</h1>
			</div>

			<div className="flex items-center gap-3">
				{/* Balance displays */}
				<div className="flex items-center gap-2 text-xs">
					{/* SolForge balance */}
					<div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5">
						<span className="text-[10px] font-medium text-muted-foreground uppercase">
							SolForge
						</span>
						{loadingBalance && solforgeBalance === null ? (
							<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
						) : (
							<span className="font-mono font-semibold text-foreground">
								${solforgeBalance ?? "0.00"}
							</span>
						)}
					</div>

					{/* Wallet balance */}
					<div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5">
						<Wallet className="h-3 w-3 text-muted-foreground" />
						{loadingBalance && walletBalance === null ? (
							<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
						) : (
							<span className="font-mono font-semibold text-foreground">
								${walletBalance ?? "0.00"}
							</span>
						)}
					</div>
				</div>

				{/* Wallet info */}
				<div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5">
					<button
						type="button"
						onClick={handleCopy}
						className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
						title="Copy wallet address"
					>
						<span className="font-mono text-[11px]">{pubkeyLabel}</span>
						{copied ? (
							<Check className="h-3 w-3 text-green-500" />
						) : (
							<Copy className="h-3 w-3" />
						)}
					</button>
					<div className="h-4 w-px bg-border" />
					<button
						type="button"
						onClick={onRegenerateWallet}
						className="rounded-md p-1 text-foreground transition hover:bg-accent"
						title="Generate a new wallet"
					>
						<RotateCcw className="h-3 w-3" />
					</button>
				</div>
			</div>
		</header>
	);
}
