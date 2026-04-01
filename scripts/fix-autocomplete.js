const fs = require("fs");
const path = "app/sistema/coach-app.jsx";
let src = fs.readFileSync(path, "utf8");

const tagRe = /<(input|select|textarea)(\b)/g;
let m;
const chunks = [];
let lastEnd = 0;
let count = 0;

while ((m = tagRe.exec(src)) !== null) {
  const start = m.index;

  // Read forward to find the closing > of this opening tag, tracking JSX expression depth
  let depth = 0;
  let j = start + m[0].length;
  while (j < src.length) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (depth === 0 && ch === ">") break;
    j++;
  }

  const fullTag = src.slice(start, j + 1);

  const hasName = /\bname=/.test(fullTag);
  const hasId = /\bid=/.test(fullTag);
  const hasAutoComplete = /\bautoComplete=|\bautocomplete=/.test(fullTag);

  if (!hasName && !hasId && !hasAutoComplete) {
    // Push everything up to just before the \b boundary after the tag name
    chunks.push(src.slice(lastEnd, start + m[0].length - m[2].length));
    chunks.push(` autoComplete="off"${m[2]}`);
    lastEnd = start + m[0].length;
    count++;
  }
}

chunks.push(src.slice(lastEnd));
fs.writeFileSync(path, chunks.join(""));
console.log(`Added autoComplete="off" to ${count} fields`);
