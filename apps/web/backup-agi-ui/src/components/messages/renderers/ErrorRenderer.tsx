import type React from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ContentJson } from "./types";

interface ErrorRendererProps {
	contentJson: ContentJson;
	debug?: boolean;
}

export function ErrorRenderer({ contentJson, debug }: ErrorRendererProps) {
	const [showRawDetails, setShowRawDetails] = useState(false);

	// Handle different error structures:
	// 1. { error: { name, url, statusCode, ... } } - from API errors
	// 2. { message, type, details: { ... }, isAborted } - from toErrorPayload
	// 3. { message, ... } - simple errors

	let errorDetails: Record<string, unknown> | undefined;
	let errorMessage: string | undefined;
	let errorType: string | undefined;
	let isAborted = false;

	// Check if we have the nested 'error' structure
	if (contentJson.error && typeof contentJson.error === "object") {
		errorDetails = contentJson.error as Record<string, unknown>;
		// Try to extract message from nested error
		if (errorDetails.message && typeof errorDetails.message === "string") {
			errorMessage = errorDetails.message;
		}
		if (errorDetails.type && typeof errorDetails.type === "string") {
			errorType = errorDetails.type;
		}
	}
	// Check if we have the toErrorPayload structure
	else if (contentJson.details && typeof contentJson.details === "object") {
		errorDetails = contentJson.details as Record<string, unknown>;
		if (contentJson.message && typeof contentJson.message === "string") {
			errorMessage = contentJson.message;
		}
		if (contentJson.type && typeof contentJson.type === "string") {
			errorType = contentJson.type;
		}
		if (contentJson.isAborted === true) {
			isAborted = true;
		}
	}
	// Simple error structure
	else {
		if (contentJson.message && typeof contentJson.message === "string") {
			errorMessage = contentJson.message;
		}
		if (contentJson.type && typeof contentJson.type === "string") {
			errorType = contentJson.type;
		}
		if (contentJson.isAborted === true) {
			isAborted = true;
		}
		// Use the whole contentJson as details if we don't have a specific details field
		errorDetails = contentJson as Record<string, unknown>;
	}

	// Try to extract and parse API error from responseBody if available
	let apiError: { type?: string; message?: string } | undefined;
	if (
		errorDetails?.responseBody &&
		typeof errorDetails.responseBody === "string"
	) {
		try {
			const parsed = JSON.parse(errorDetails.responseBody);
			if (parsed.error && typeof parsed.error === "object") {
				apiError = {
					type:
						typeof parsed.error.type === "string"
							? parsed.error.type
							: undefined,
					message:
						typeof parsed.error.message === "string"
							? parsed.error.message
							: undefined,
				};
			}
		} catch {
			// Ignore parse errors
		}
	}

	const renderValue = (value: unknown): React.JSX.Element => {
		if (value === null || value === undefined) {
			return <span className="text-muted-foreground">null</span>;
		}
		if (typeof value === "boolean") {
			return (
				<span className="text-amber-600 dark:text-amber-400">
					{String(value)}
				</span>
			);
		}
		if (typeof value === "number") {
			return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
		}
		if (typeof value === "string") {
			// If it looks like JSON, try to format it
			if (value.startsWith("{") || value.startsWith("[")) {
				try {
					const parsed = JSON.parse(value);
					return (
						<pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
							<code>{JSON.stringify(parsed, null, 2)}</code>
						</pre>
					);
				} catch {
					// Not valid JSON, render as string
				}
			}
			return <span className="text-foreground">{value}</span>;
		}
		if (typeof value === "object") {
			return (
				<pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
					<code>{JSON.stringify(value, null, 2)}</code>
				</pre>
			);
		}
		return <span className="text-foreground">{String(value)}</span>;
	};

	const importantFields = [
		"name",
		"statusCode",
		"url",
		"model",
		"isRetryable",
		"cause",
	];
	const renderedFields = new Set<string>();

	return (
		<div className="space-y-2 text-sm">
			{isAborted && (
				<div className="text-amber-600 dark:text-amber-400 font-medium">
					Request aborted
				</div>
			)}

			{/* Show API error message first if available */}
			{apiError?.message && (
				<div className="space-y-1">
					<div className="font-medium text-red-600 dark:text-red-400">
						API Error:
					</div>
					<div className="text-foreground">{apiError.message}</div>
					{apiError.type && (
						<div className="text-xs text-muted-foreground">
							Type: {apiError.type}
						</div>
					)}
				</div>
			)}

			{/* Show regular error message if no API error */}
			{!apiError?.message && errorMessage && (
				<div className="space-y-1">
					<div className="font-medium text-red-600 dark:text-red-400">
						Error:
					</div>
					<div className="text-foreground">{errorMessage}</div>
					{errorType && (
						<div className="text-xs text-muted-foreground">
							Type: {errorType}
						</div>
					)}
				</div>
			)}

			{/* Show important details from errorDetails */}
			{errorDetails && (
				<div className="space-y-1.5">
					{importantFields.map((field) => {
						const value = errorDetails[field];
						if (value === undefined || value === null) return null;
						renderedFields.add(field);
						return (
							<div key={field} className="flex gap-2">
								<span className="font-medium text-muted-foreground min-w-[100px]">
									{field}:
								</span>
								{renderValue(value)}
							</div>
						);
					})}
				</div>
			)}

			{/* Collapsible raw details */}
			{errorDetails && (
				<div className="mt-3 border-t border-border pt-2">
					<button
						type="button"
						onClick={() => setShowRawDetails(!showRawDetails)}
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						{showRawDetails ? (
							<ChevronDown className="h-3 w-3" />
						) : (
							<ChevronRight className="h-3 w-3" />
						)}
						{showRawDetails ? "Hide" : "View"} Raw Error Details
					</button>
					{showRawDetails && (
						<div className="mt-2">
							<pre className="p-3 bg-muted/50 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
								<code>{JSON.stringify(errorDetails, null, 2)}</code>
							</pre>
						</div>
					)}
				</div>
			)}

			{debug && (
				<details className="mt-4 text-xs">
					<summary className="cursor-pointer text-muted-foreground">
						Debug Info
					</summary>
					<pre className="mt-2 p-2 bg-muted/30 rounded overflow-x-auto">
						<code>
							{JSON.stringify({ contentJson, errorDetails, apiError }, null, 2)}
						</code>
					</pre>
				</details>
			)}
		</div>
	);
}
