# Chat App Implementation Plan

## Phase 0 – Discovery
- Audit `apps/ai` auth, x402 metering, service layers, and persistence helpers to understand patterns we can reuse.
- Review `apps/website` styling (Tailwind config, tokens, dark-mode strategy) to mirror setup in `apps/chat`.

## Phase 1 – Data Model (Postgres)
- Port the provided session/message/message-part/artifact schema to Postgres via `drizzle-orm/pg-core`, adjusting field types (`timestamp`, `bigint`, `jsonb`) and constraints.
- Add cascade rules, indexes (session last active, message creation, part ordering), and document retention/cleanup strategy.
- Create Bun/Drizzle migrations that add `sessions`, `messages`, `message_parts`, and `artifacts` tables.

## Phase 2 – Backend Services
- Implement repository/service modules for CRUD on sessions and messages using the Postgres driver.
- Expose chat endpoints in `apps/ai`: list sessions, create session, get session detail + paginated messages, send message, stream assistant reply, rename/archive session.
- Reuse existing auth + x402 metering middleware, surfacing token/tool usage metrics on responses/logs.
- Factor the OpenAI-compatible client (from `apps/ai/test/openai-compatible-client.ts`) into a reusable helper or package.
- Add validation (zod/valibot) and comprehensive tests covering success, failure, and auth edge cases.

## Phase 3 – Frontend Scaffolding (`apps/chat`)
- Align Vite/Bun build with `apps/website`, sharing Tailwind config, theme provider, and default dark mode.
- Define structure: layout with sidebar (`SessionList`) and main view (`ChatThread`), message composer, hooks (`useSessions`, `useMessages`), and shared UI primitives.
- Implement optimistic updates, streaming indicators, error handling, and keyboard accessibility; ensure responsive desktop-first layout.

## Phase 4 – Shared Client SDK
- Create `packages/solforge-client` (or interim shared module) with typed helpers for chat + existing AI endpoints, handling auth token injection, x402 metadata, retries/backoff.
- Consume the shared client in both backend services (when appropriate) and the new frontend.

## Phase 5 – Testing & QA
- Backend: extend Bun test suite plus contract/integration tests targeting Postgres (container or dedicated test DB).
- Frontend: component tests (Vitest + Testing Library) and e2e coverage (Playwright/Cypress) for session creation, message flow, auth failures.
- Performance: profile message rendering (virtualize long histories if needed) and validate network efficiency.

## Phase 6 – Documentation & Rollout
- Update monorepo docs (README, CHANGELOG) with schema additions, env vars, backend endpoints, and chat app setup.
- Provide migration/deployment order (DB → backend → frontend) with rollback guidance.
- Add onboarding notes for developers (seed scripts, local Postgres config) and plan staged rollout or feature flag.

## Postgres Schema Draft
```ts
import {
	boolean,
	bigint,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	title: text('title'),
	agent: text('agent').notNull(),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	projectPath: text('project_path').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
	totalInputTokens: bigint('total_input_tokens', { mode: 'number' }),
	totalOutputTokens: bigint('total_output_tokens', { mode: 'number' }),
	totalCachedTokens: bigint('total_cached_tokens', { mode: 'number' }),
	totalReasoningTokens: bigint('total_reasoning_tokens', { mode: 'number' }),
	totalToolTimeMs: integer('total_tool_time_ms'),
	toolCountsJson: jsonb('tool_counts_json'),
});

export const messages = pgTable('messages', {
	id: text('id').primaryKey(),
	sessionId: text('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	role: text('role').notNull(), // 'system' | 'user' | 'assistant' | 'tool'
	status: text('status').notNull(), // 'pending' | 'complete' | 'error'
	agent: text('agent').notNull(),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	latencyMs: integer('latency_ms'),
	promptTokens: bigint('prompt_tokens', { mode: 'number' }),
	completionTokens: bigint('completion_tokens', { mode: 'number' }),
	totalTokens: bigint('total_tokens', { mode: 'number' }),
	cachedInputTokens: bigint('cached_input_tokens', { mode: 'number' }),
	reasoningTokens: bigint('reasoning_tokens', { mode: 'number' }),
	error: text('error'),
	errorType: text('error_type'),
	errorDetails: jsonb('error_details'),
	isAborted: boolean('is_aborted'),
});

export const messageParts = pgTable('message_parts', {
	id: text('id').primaryKey(),
	messageId: text('message_id')
		.notNull()
		.references(() => messages.id, { onDelete: 'cascade' }),
	index: integer('index').notNull(),
	stepIndex: integer('step_index'),
	type: text('type').notNull(), // 'text' | 'tool_call' | 'tool_result' | 'image' | 'error'
	content: jsonb('content').notNull(),
	agent: text('agent').notNull(),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	toolName: text('tool_name'),
	toolCallId: text('tool_call_id'),
	toolDurationMs: integer('tool_duration_ms'),
});

export const artifacts = pgTable('artifacts', {
	id: text('id').primaryKey(),
	messagePartId: text('message_part_id')
		.notNull()
		.unique()
		.references(() => messageParts.id, { onDelete: 'cascade' }),
	kind: text('kind').notNull(), // 'file' | 'file_diff' | ...
	path: text('path'),
	mime: text('mime'),
	size: integer('size'),
	sha256: text('sha256'),
});

export const sessionsRelations = relations(sessions, ({ many }) => ({
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
	session: one(sessions, {
		fields: [messages.sessionId],
		references: [sessions.id],
	}),
	parts: many(messageParts),
}));

export const messagePartsRelations = relations(messageParts, ({ one }) => ({
	message: one(messages, {
		fields: [messageParts.messageId],
		references: [messages.id],
	}),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
	part: one(messageParts, {
		fields: [artifacts.messagePartId],
		references: [messageParts.id],
	}),
}));
```
