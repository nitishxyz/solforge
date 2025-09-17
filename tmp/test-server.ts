import { serve } from "bun";
import indexHtml from "../src/gui/public/index.html";

const server = serve({
	port: 0,
	fetch(req) {
		const url = new URL(req.url);
		if (url.pathname === "/") return new Response(indexHtml);
		return new Response("not found", { status: 404 });
	},
});

console.log(server.port);
