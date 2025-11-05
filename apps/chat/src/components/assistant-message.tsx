import { memo } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../lib/types";

interface AssistantMessageProps {
	message: ChatMessage;
	showHeader: boolean;
	isLastMessage: boolean;
	isGenerating?: boolean;
}

const loadingMessages = [
	"Generating...",
	"Cooking up something...",
	"Thinking...",
	"Processing...",
	"Working on it...",
	"Crafting response...",
	"Brewing magic...",
	"Computing...",
];

function getLoadingMessage(messageId: string) {
	// Use messageId to consistently pick the same message for this session
	const hash = messageId
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return loadingMessages[hash % loadingMessages.length];
}

function formatTime(ts?: string) {
	if (!ts) return "";
	const date = new Date(ts);
	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Memoize the component to prevent re-renders when props haven't changed
export const AssistantMessage = memo(
	function AssistantMessage({ message, showHeader }: AssistantMessageProps) {
		const parts = message.parts || [];
		const firstPart = parts[0];

		let content = "";
		if (firstPart) {
			const data = firstPart.content;
			if (data && typeof data === "object" && "text" in data) {
				content = String(data.text);
			} else if (typeof data === "string") {
				content = data;
			}
		}

		const shouldShowLoadingFallback =
			message.status === "pending" && !content.trim();

		return (
			<div className="relative">
				{/* Header with avatar */}
				{showHeader && (
					<div className="pb-2">
						<div className="inline-flex items-center bg-violet-500/10 border border-violet-500/30 dark:bg-violet-500/5 dark:border-violet-500/20 rounded-full pr-3 md:pr-4">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500/50 bg-violet-500/20 dark:bg-violet-500/10">
								<Sparkles className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300" />
							</div>
							<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm text-muted-foreground pl-3">
								{message.agent && (
									<span className="font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
										{message.agent}
									</span>
								)}
								{message.agent && message.provider && (
									<span className="hidden md:inline">·</span>
								)}
								{message.provider && (
									<span className="text-muted-foreground whitespace-nowrap">
										{message.provider}
									</span>
								)}
								{message.model && <span className="hidden md:inline">·</span>}
								{message.model && (
									<span className="text-muted-foreground break-all md:break-normal">
										{message.model}
									</span>
								)}
								{message.createdAt && (
									<span className="hidden md:inline">·</span>
								)}
								{message.createdAt && (
									<span className="text-muted-foreground whitespace-nowrap">
										{formatTime(message.createdAt)}
									</span>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Message content */}
				<div className="relative ml-1">
					{shouldShowLoadingFallback ? (
						<div className="flex gap-3 pb-2 relative">
							<div className="flex-shrink-0 w-6 flex items-start justify-center relative pt-0.5">
								<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full relative bg-card text-violet-700 dark:bg-background dark:text-violet-300">
									<Sparkles className="h-4 w-4" />
								</div>
							</div>
							<div className="flex-1 pt-0.5">
								<div className="text-base text-foreground animate-pulse">
									{getLoadingMessage(message.id)}
								</div>
							</div>
						</div>
					) : (
						<div className="flex gap-3 pb-2 relative">
							<div className="flex-shrink-0 w-6 flex items-start justify-center relative pt-0.5">
								<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full relative bg-background">
									<Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
								</div>
							</div>
							<div className="flex-1 pt-0 -mt-0.5">
								<div className="text-base text-foreground leading-relaxed markdown-content max-w-full overflow-hidden">
									<div className="prose prose-sm dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 max-w-none">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{content || " "}
										</ReactMarkdown>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison function for better memoization
		// Only re-render if the message content or display props have actually changed
		const prevParts = prevProps.message.parts || [];
		const nextParts = nextProps.message.parts || [];

		// Check if parts have changed
		if (prevParts.length !== nextParts.length) {
			return false;
		}

		// Check each part's content
		for (let i = 0; i < prevParts.length; i++) {
			const prevPart = prevParts[i];
			const nextPart = nextParts[i];
			if (
				prevPart.id !== nextPart.id ||
				prevPart.content !== nextPart.content ||
				prevPart.completedAt !== nextPart.completedAt
			) {
				return false;
			}
		}

		// Check message-level props
		return (
			prevProps.message.id === nextProps.message.id &&
			prevProps.message.status === nextProps.message.status &&
			prevProps.message.completedAt === nextProps.message.completedAt &&
			prevProps.showHeader === nextProps.showHeader &&
			prevProps.isLastMessage === nextProps.isLastMessage &&
			prevProps.isGenerating === nextProps.isGenerating
		);
	},
);
