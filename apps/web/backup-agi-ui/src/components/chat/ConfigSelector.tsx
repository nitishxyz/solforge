import { useEffect } from "react";
import { Settings } from "lucide-react";
import { useConfig, useModels } from "../../hooks/useConfig";

interface ConfigSelectorProps {
	agent: string;
	provider: string;
	model: string;
	onAgentChange: (agent: string) => void;
	onProviderChange: (provider: string) => void;
	onModelChange: (model: string) => void;
}

export function ConfigSelector({
	agent,
	provider,
	model,
	onAgentChange,
	onProviderChange,
	onModelChange,
}: ConfigSelectorProps) {
	const { data: config, isLoading: configLoading } = useConfig();
	const { data: modelsData, isLoading: modelsLoading } = useModels(provider);

	console.log("ConfigSelector rendered", {
		config,
		configLoading,
		agent,
		provider,
		model,
	});

	// Set defaults when config loads
	useEffect(() => {
		if (config && !agent && !provider && !model) {
			onAgentChange(config.defaults.agent);
			onProviderChange(config.defaults.provider);
			onModelChange(config.defaults.model);
		}
	}, [
		config,
		agent,
		provider,
		model,
		onAgentChange,
		onProviderChange,
		onModelChange,
	]);

	// Update model when provider changes
	useEffect(() => {
		if (modelsData && modelsData.models.length > 0) {
			const currentModelExists = modelsData.models.some((m) => m.id === model);
			if (!currentModelExists) {
				onModelChange(modelsData.default || modelsData.models[0].id);
			}
		}
	}, [modelsData, model, onModelChange]);

	if (configLoading) {
		return (
			<div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-background/50">
				<Settings className="h-4 w-4 text-muted-foreground animate-spin" />
				<span className="text-xs text-muted-foreground">Loading config...</span>
			</div>
		);
	}

	if (!config) return null;

	return (
		<div className="absolute bottom-24 left-0 right-0 pb-2 px-4 pointer-events-none z-40">
			<div className="max-w-3xl mx-auto pointer-events-auto">
				<div className="flex items-center gap-2 px-4 py-2 border border-border bg-background/95 backdrop-blur-sm rounded-lg">
					<Settings className="h-4 w-4 text-muted-foreground" />

					<select
						value={agent}
						onChange={(e) => onAgentChange(e.target.value)}
						className="text-xs bg-background border border-border rounded px-2 py-1 outline-none"
					>
						{config.agents.map((a) => (
							<option key={a} value={a}>
								{a}
							</option>
						))}
					</select>

					<select
						value={provider}
						onChange={(e) => onProviderChange(e.target.value)}
						className="text-xs bg-background border border-border rounded px-2 py-1 outline-none"
					>
						{config.providers.map((p) => (
							<option key={p} value={p}>
								{p}
							</option>
						))}
					</select>

					<select
						value={model}
						onChange={(e) => onModelChange(e.target.value)}
						disabled={modelsLoading || !modelsData}
						className="text-xs bg-background border border-border rounded px-2 py-1 outline-none disabled:opacity-50"
					>
						{modelsData?.models.map((m) => (
							<option key={m.id} value={m.id}>
								{m.label}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
