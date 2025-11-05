import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";

interface MessageComposerProps {
	onSubmit: (message: string) => Promise<void> | void;
	disabled?: boolean;
}

export function MessageComposer({ onSubmit, disabled }: MessageComposerProps) {
	const [value, setValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Focus textarea when component mounts or disabled changes
	useEffect(() => {
		if (!disabled) {
			textareaRef.current?.focus();
		}
	}, [disabled]);

	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	useEffect(() => {
		adjustTextareaHeight();
	}, [adjustTextareaHeight, value]);

	async function handleSubmit(event?: React.FormEvent) {
		event?.preventDefault();
		if (!value.trim() || disabled || isSubmitting) {
			return;
		}

		setIsSubmitting(true);
		try {
			await onSubmit(value.trim());
			setValue("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		} finally {
			setIsSubmitting(false);
			textareaRef.current?.focus();
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	return (
		<div className="border-t border-border bg-background px-4 py-4">
			<div className="max-w-3xl mx-auto">
				<div className="flex items-end gap-1 rounded-3xl p-1 bg-card border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={
							disabled ? "Select a session to start..." : "Type a message..."
						}
						disabled={disabled || isSubmitting}
						rows={1}
						className="border-0 bg-transparent pl-3 pr-2 py-2 max-h-[200px] overflow-y-auto leading-normal resize-none scrollbar-hide text-base w-full text-foreground placeholder:text-muted-foreground outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
						style={{ height: "2.5rem" }}
					/>
					<button
						type="button"
						onClick={() => handleSubmit()}
						disabled={disabled || isSubmitting || !value.trim()}
						className={`flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0 ${
							value.trim() && !disabled && !isSubmitting
								? "bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground"
								: "bg-muted text-muted-foreground cursor-not-allowed"
						}`}
					>
						<ArrowUp className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
