ALTER TABLE "users" ALTER COLUMN "balance_usd" SET DATA TYPE numeric(12, 8);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "balance_usd" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "total_spent" SET DATA TYPE numeric(12, 8);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "total_spent" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount_usd" SET DATA TYPE numeric(12, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "balance_before" SET DATA TYPE numeric(12, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "balance_after" SET DATA TYPE numeric(12, 8);