ALTER TABLE `transactions` ADD `pre_token_balances_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `post_token_balances_json` text DEFAULT '[]' NOT NULL;