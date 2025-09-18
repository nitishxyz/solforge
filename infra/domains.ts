const SUB = $app.stage === "prod" ? "" : `${$app.stage}.`;

const HOST = "solforge.sh";

export const domains = {
	web: `${SUB}${HOST}`,
	platform: `${SUB}rpc.${HOST}`,
	sh: `${SUB}install.${HOST}`,
};
