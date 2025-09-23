import { decodeBase58 } from "../server/lib/base58";

const s = process.argv[2] || "84eT";
const bytes = decodeBase58(s);
console.log(bytes);
console.log(
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join(" "),
);
