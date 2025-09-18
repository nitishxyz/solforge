import { createRoot } from "react-dom/client";
import "../public/app.css";
import { App } from "./app";

function render() {
	const el = document.getElementById("root");
	if (!el) return;
	const root = createRoot(el);
	root.render(<App />);
}

// Ensure we render whether or not DOMContentLoaded has already fired
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", render);
} else {
	render();
}
