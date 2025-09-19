import { type ReactNode, useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	icon?: string;
	iconColor?: string;
}

export function Modal({
	isOpen,
	title,
	onClose,
	children,
	footer,
	icon = "fa-window-maximize",
	iconColor = "purple",
}: ModalProps) {
	useEffect(() => {
		if (!isOpen || typeof window === "undefined") return undefined;
		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const colorClasses = {
		purple: "from-purple-500/20 to-violet-500/20 text-purple-400",
		blue: "from-blue-500/20 to-cyan-500/20 text-blue-400",
		amber: "from-amber-500/20 to-orange-500/20 text-amber-400",
		green: "from-green-500/20 to-emerald-500/20 text-green-400",
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				aria-label="Close modal"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onClose();
				}}
			/>

			{/* Modal */}
			<div className="w-full max-w-lg p-0 relative animate-modalSlideIn overflow-hidden rounded-2xl border border-white/20 bg-gray-900/95 backdrop-blur-xl shadow-2xl">
				{/* Header */}
				<div className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div
								className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[iconColor as keyof typeof colorClasses]} flex items-center justify-center`}
							>
								<i className={`fas ${icon}`}></i>
							</div>
							<h3 className="text-xl font-bold text-white">{title}</h3>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="btn-icon hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
							aria-label="Close modal"
						>
							<i className="fas fa-times"></i>
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
					{children}
				</div>

				{/* Footer */}
				{footer && (
					<div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
						{footer}
					</div>
				)}
			</div>

			<style jsx>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				
				@keyframes modalSlideIn {
					from {
						opacity: 0;
						transform: scale(0.95) translateY(20px);
					}
					to {
						opacity: 1;
						transform: scale(1) translateY(0);
					}
				}
				
				.animate-fadeIn {
					animation: fadeIn 0.2s ease-out;
				}
				
				.animate-modalSlideIn {
					animation: modalSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
				}
				
				.custom-scrollbar::-webkit-scrollbar {
					width: 8px;
				}
				
				.custom-scrollbar::-webkit-scrollbar-track {
					background: transparent;
				}
				
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: linear-gradient(180deg, var(--color-accent-primary), var(--color-accent-secondary));
					border-radius: 4px;
				}
			`}</style>
		</div>
	);
}
