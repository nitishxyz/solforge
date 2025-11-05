const SUB = $app.stage === "prod" ? "" : `${$app.stage}.`;

const HOST = "solforge.sh";

export const domains = {
	web: `${SUB}${HOST}`,
	rpc: `${SUB}rpc.${HOST}`,
	gui: `${SUB}gui.${HOST}`,
	sh: `${SUB}install.${HOST}`,
	aiService: `${SUB}ai.service.${HOST}`,
	ai: `${SUB}ai.${HOST}`,
	chat: `${SUB}chat.${HOST}`,
};
