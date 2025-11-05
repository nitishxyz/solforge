CREATE TABLE "artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_part_id" text NOT NULL,
	"kind" text NOT NULL,
	"path" text,
	"mime" text,
	"size" integer,
	"sha256" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"title" text,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"project_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone,
	"total_input_tokens" bigint,
	"total_output_tokens" bigint,
	"total_cached_tokens" bigint,
	"total_reasoning_tokens" bigint,
	"total_tool_time_ms" integer,
	"tool_counts_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"latency_ms" integer,
	"prompt_tokens" bigint,
	"completion_tokens" bigint,
	"total_tokens" bigint,
	"cached_input_tokens" bigint,
	"reasoning_tokens" bigint,
	"error" text,
	"error_type" text,
	"error_details" jsonb,
	"is_aborted" boolean
);
--> statement-breakpoint
CREATE TABLE "message_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"index" integer NOT NULL,
	"step_index" integer,
	"type" text NOT NULL,
	"content" jsonb NOT NULL,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"tool_name" text,
	"tool_call_id" text,
	"tool_duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_message_part_id_message_parts_id_fk" FOREIGN KEY ("message_part_id") REFERENCES "public"."message_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_parts" ADD CONSTRAINT "message_parts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_message_part_idx" ON "artifacts" USING btree ("message_part_id");--> statement-breakpoint
CREATE INDEX "sessions_wallet_idx" ON "sessions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "sessions_agent_idx" ON "sessions" USING btree ("agent");--> statement-breakpoint
CREATE INDEX "sessions_last_active_idx" ON "sessions" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "messages_session_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "message_parts_message_idx" ON "message_parts" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_parts_order_idx" ON "message_parts" USING btree ("message_id","index");