import { useAgiStore } from "../stores/agiStore";
import { Bot } from "lucide-react";

export function AgiFloatingButton() {
	const toggleOpen = useAgiStore((state) => state.toggleOpen);
	const isOpen = useAgiStore((state) => state.isOpen);

	return (
		<button
			type="button"
			onClick={toggleOpen}
			className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl ${
				isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
			}`}
			aria-label="Open AI Assistant"
		>
			<Bot className="h-6 w-6" />
		</button>
	);
}
