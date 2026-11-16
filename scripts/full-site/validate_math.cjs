const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'source/frontend/package.json'));
const katex = req('katex');
const formulaFields = new Set(['tex', 'formula', 'find', 'given']);
const errors = [];
const strictWarnings = new Set();
let count = 0;

function tex(value, where) {
  if (!value) return;
  try {
    katex.renderToString(value, {
      throwOnError: true,
      // Match the app's strictness for compatibility warnings such as Cyrillic text.
      strict: code => {
        strictWarnings.add(code);
        return 'ignore';
      },
    });
    count++;
  } catch (error) {
    errors.push({ where, value, error: error.message });
  }
}

function inspect(value, where, key) {
  // A single backslash in JSON can turn the beginning of a command into a tab or carriage return.
  if (Array.from(value).some(character => character.charCodeAt(0) < 32)) {
    errors.push({ where, value, error: 'Unexpected control character in curriculum text' });
  }
  if (formulaFields.has(key)) {
    tex(value, where);
    return;
  }
  for (const match of value.matchAll(/\$([^$]+)\$/g)) tex(match[1], where);
  const plain = value.replace(/\$[^$]+\$/g, '');
  const prose = plain.replace(/\[\[[^\[\]]+\]\]/g, '');
  if (/\$|\\[A-Za-z]+|\[\[|\]\]/.test(prose)) {
    errors.push({ where, value, error: 'Unpaired math delimiters, a TeX command in prose, or malformed term markup' });
  }
}

function walk(value, where, key) {
  if (typeof value === 'string') {
    inspect(value, where, key);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${where}[${i}]`, key));
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) walk(item, `${where}.${name}`, name);
  }
}

function visit(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      visit(file);
    } else if (entry.name.endsWith('.json')) {
      walk(JSON.parse(fs.readFileSync(file, 'utf8')), path.relative(root, file), '');
    }
  }
}

visit(path.join(root, 'source/backend/curriculum'));
console.log(JSON.stringify({ expressions: count, errors, strictWarningCodes: [...strictWarnings].sort() }, null, 2));
if (errors.length) process.exitCode = 1;
