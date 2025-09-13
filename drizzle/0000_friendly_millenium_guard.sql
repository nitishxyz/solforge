CREATE TABLE `accounts` (
	`address` text PRIMARY KEY NOT NULL,
	`lamports` integer NOT NULL,
	`owner_program` text NOT NULL,
	`executable` integer NOT NULL,
	`rent_epoch` integer NOT NULL,
	`data_len` integer NOT NULL,
	`data_base64` text,
	`last_slot` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_owner` ON `accounts` (`owner_program`);--> statement-breakpoint
CREATE INDEX `idx_accounts_last_slot` ON `accounts` (`last_slot`);--> statement-breakpoint
CREATE TABLE `address_signatures` (
	`address` text NOT NULL,
	`signature` text NOT NULL,
	`slot` integer NOT NULL,
	`err` integer NOT NULL,
	`block_time` integer,
	PRIMARY KEY(`address`, `signature`)
);
--> statement-breakpoint
CREATE INDEX `idx_address_signatures_addr_slot` ON `address_signatures` (`address`,`slot`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`signature` text PRIMARY KEY NOT NULL,
	`slot` integer NOT NULL,
	`block_time` integer,
	`version` text NOT NULL,
	`err_json` text,
	`fee` integer NOT NULL,
	`raw_base64` text NOT NULL,
	`pre_balances_json` text NOT NULL,
	`post_balances_json` text NOT NULL,
	`logs_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_slot` ON `transactions` (`slot`);--> statement-breakpoint
CREATE TABLE `tx_accounts` (
	`signature` text NOT NULL,
	`account_index` integer NOT NULL,
	`address` text NOT NULL,
	`signer` integer NOT NULL,
	`writable` integer NOT NULL,
	`program_id_index` integer,
	PRIMARY KEY(`signature`, `account_index`)
);
--> statement-breakpoint
CREATE INDEX `idx_tx_accounts_address` ON `tx_accounts` (`address`);--> statement-breakpoint
CREATE INDEX `idx_tx_accounts_address_signature` ON `tx_accounts` (`address`,`signature`);--> statement-breakpoint
CREATE TABLE `meta_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
