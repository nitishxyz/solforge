CREATE TABLE `tx_account_states` (
	`signature` text NOT NULL,
	`address` text NOT NULL,
	`pre_json` text,
	`post_json` text,
	PRIMARY KEY(`signature`, `address`)
);
--> statement-breakpoint
CREATE INDEX `idx_tx_account_states_address` ON `tx_account_states` (`address`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `inner_instructions_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `compute_units` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `return_data_program_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `return_data_base64` text;