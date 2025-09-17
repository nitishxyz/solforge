import * as p from "@clack/prompts";
import {
	getConfigValue,
	readConfig,
	setConfigValue,
	writeDefaultConfig,
} from "../../config";
import { parseFlags } from "../utils/args";

export async function configCommand(sub: string | undefined, args: string[]) {
	switch (sub) {
		case "init": {
			const { flags } = parseFlags(args);
			const force = !!flags["force"];
			await writeDefaultConfig({ force });
			p.log.success("Wrote sf.config.json");
			return;
		}
		case "get": {
			const key = args[0];
			const cfg = await readConfig();
			console.log(getConfigValue(cfg, key));
			return;
		}
		case "set": {
			const [key, value] = args;
			const cfg = await readConfig();
			const updated = setConfigValue(cfg, key, value);
			await Bun.write(
				"sf.config.json",
				JSON.stringify(updated, null, 2) + "\n",
			);
			p.log.success(`Updated ${key}`);
			return;
		}
		default:
			p.log.error("Usage: solforge config <init|get|set>");
	}
}
