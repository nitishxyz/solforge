import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import type { LiteSVM } from "litesvm";

export class Heartbeat {
	private interval: Timer | null = null;
	private keypair: Keypair;
	private isRunning = false;

	constructor(
		private svm: LiteSVM,
		private onTick?: () => void,
	) {
		this.keypair = Keypair.generate();
	}

	start() {
		if (this.isRunning) return;
		this.isRunning = true;

		this.interval = setInterval(() => {
			try {
				this.sendDummyTransaction();
				this.onTick?.();
			} catch (error) {
				console.error("[heartbeat] Error sending dummy transaction:", error);
			}
		}, 1000);

		console.log("[heartbeat] Started - sending dummy transactions every 1s");
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.isRunning = false;
		console.log("[heartbeat] Stopped");
	}

	private sendDummyTransaction() {
		const tx = new Transaction().add(
			SystemProgram.transfer({
				fromPubkey: this.keypair.publicKey,
				toPubkey: this.keypair.publicKey,
				lamports: 0,
			}),
		);

		tx.recentBlockhash = this.svm.latestBlockhash();
		tx.feePayer = this.keypair.publicKey;
		tx.sign(this.keypair);

		this.svm.sendTransaction(tx);
	}
}
