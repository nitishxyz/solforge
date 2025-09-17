import indexHtml from "../src/gui/public/index.html";

console.log(Object.keys(indexHtml));
console.log(indexHtml.routes?.map((route: any) => route.path));
console.dir(indexHtml, { depth: 3 });
