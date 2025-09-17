import indexHtml from "../src/gui/public/index.html";
console.log("fetch" in indexHtml, typeof (indexHtml as any).fetch);
console.log("serve" in indexHtml, typeof (indexHtml as any).serve);
