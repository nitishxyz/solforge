CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_usd` text NOT NULL,
	`tx_signature` text,
	`provider` text,
	`model` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`balance_after` text NOT NULL,
	`created_at` integer NOT NULL
);
