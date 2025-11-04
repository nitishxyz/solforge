CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"balance_usd" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"total_spent" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"total_topups" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_payment" timestamp,
	"last_request" timestamp
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"type" text NOT NULL,
	"amount_usd" numeric(10, 4) NOT NULL,
	"tx_signature" text,
	"topup_amount" numeric(10, 2),
	"provider" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"balance_before" numeric(10, 4) NOT NULL,
	"balance_after" numeric(10, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"tx_signature" text NOT NULL,
	"amount_usd" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"facilitator_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "payment_logs_tx_signature_unique" UNIQUE("tx_signature")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tx_wallet_idx" ON "transactions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "tx_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tx_created_at_idx" ON "transactions" USING btree ("created_at");