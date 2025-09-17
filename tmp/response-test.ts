import indexHtml from "../src/gui/public/index.html";

const res = new Response(indexHtml);
const text = await res.text();
console.log(text.slice(0, 60));
