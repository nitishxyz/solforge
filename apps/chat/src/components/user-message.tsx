import { memo } from "react";
import { User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../lib/types";

interface UserMessageProps {
	message: ChatMessage;
	isFirst: boolean;
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
export const UserMessage = memo(
	function UserMessage({ message }: UserMessageProps) {
		const parts = message.parts || [];
		const firstPart = parts[0];

		if (!firstPart) return null;

		let content = "";
		const data = firstPart.content;
		if (data && typeof data === "object" && "text" in data) {
			content = String(data.text);
		} else if (typeof data === "string") {
			content = data;
		} else if (data) {
			content = JSON.stringify(data, null, 2);
		}

		return (
			<div className="relative pb-8 pt-6">
				<div className="flex gap-3 md:gap-4 justify-end">
					<div className="flex flex-col items-end min-w-0 flex-1 max-w-[calc(100%-3rem)] md:max-w-2xl">
						<div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 justify-end">
							<span className="font-medium text-emerald-700 dark:text-emerald-300">
								You
							</span>
							{message.createdAt && <span>·</span>}
							{message.createdAt && (
								<span>{formatTime(message.createdAt)}</span>
							)}
						</div>
						<div className="inline-block max-w-full text-sm text-foreground leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 [word-break:break-word] overflow-hidden">
							<div className="prose prose-sm dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_*]:[word-break:break-word] [&_*]:overflow-wrap-anywhere max-w-none">
								<ReactMarkdown remarkPlugins={[remarkGfm]}>
									{content}
								</ReactMarkdown>
							</div>
						</div>
					</div>
					<div className="flex-shrink-0 w-8 flex items-start justify-center">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/20 dark:bg-emerald-500/10 relative bg-background">
							<User className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
						</div>
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison function for better memoization
		// User messages don't change after creation, so we only need to check the message ID
		const prevFirstPart = prevProps.message.parts?.[0];
		const nextFirstPart = nextProps.message.parts?.[0];

		return (
			prevProps.message.id === nextProps.message.id &&
			prevFirstPart?.content === nextFirstPart?.content &&
			prevProps.message.createdAt === nextProps.message.createdAt
		);
	},
);
