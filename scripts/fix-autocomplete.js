const fs = require("fs");
const path = "app/sistema/coach-app.jsx";
let src = fs.readFileSync(path, "utf8");

// Step 1: Remove any autoComplete="off" we previously added
src = src.replace(/ autoComplete="off"/g, "");

// Step 2: Add name="field_N" to every <input|select|textarea missing name= and id=
const tagRe = /<(input|select|textarea)(\b)/g;
let m;
const chunks = [];
let lastEnd = 0;
let count = 0;
let fieldNum = 1;

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

  if (!hasName && !hasId) {
    chunks.push(src.slice(lastEnd, start + m[0].length - m[2].length));
    chunks.push(` name="field_${fieldNum++}"${m[2]}`);
    lastEnd = start + m[0].length;
    count++;
  }
}

chunks.push(src.slice(lastEnd));
fs.writeFileSync(path, chunks.join(""));
console.log(`Added name="field_N" to ${count} fields`);
