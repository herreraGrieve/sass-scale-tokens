var sass = require('sass'),
    fs   = require('fs');

var sass_dir   = 'scss/fit.scss',
    output_dir = 'css/',
    output_css  = output_dir + 'fit.css';

//  Generate config.js from _config.scss

function parseMap(content) {
    content = content.replace(/\/\/[^\n]*/g, '');
    var out = {}, i = 0;

    while (i < content.length) {
        while (i < content.length && /\s/.test(content[i])) i++;
        if (i >= content.length) break;

        var colon = content.indexOf(':', i);
        if (colon === -1) break;
        var key = content.slice(i, colon).trim();
        if (!key) break;
        i = colon + 1;
        while (i < content.length && content[i] === ' ') i++;

        if (content[i] === '(') {
            var depth = 0, start = i;
            while (i < content.length) {
                if      (content[i] === '(') depth++;
                else if (content[i] === ')') { depth--; if (depth === 0) { i++; break; } }
                i++;
            }
            var inner = content.slice(start + 1, i - 1).trim();
            out[key] = inner.includes(':') ? parseMap(inner) : parseList(inner);
            while (i < content.length && /[,\s]/.test(content[i])) i++;
        } else {
            var depth = 0, inQ = null, start = i;
            while (i < content.length) {
                var c = content[i];
                if (inQ)                         { if (c === inQ) inQ = null; }
                else if (c === '"' || c === "'") { inQ = c; }
                else if (c === '(')              depth++;
                else if (c === ')')              { if (!depth) break; depth--; }
                else if (c === ',' && !depth)    break;
                i++;
            }
            out[key] = coerce(content.slice(start, i).trim());
            if (content[i] === ',') i++;
        }
    }
    return out;
}

function parseList(content) {
    return content.split(',').map(function(v) { return coerce(v.trim()); }).filter(function(v) { return v !== ''; });
}

function coerce(val) {
    if (val === 'true')  return true;
    if (val === 'false') return false;
    if (/^['"]/.test(val)) return val.slice(1, -1);
    if (/^[\d. ]+$/.test(val) && /\s/.test(val))
        return val.trim().split(/\s+/).map(Number);
    var n = Number(val);
    if (!isNaN(n) && val !== '') return n;
    return val;
}

var src   = fs.readFileSync('scss/_config.scss', 'utf8');
var match = /\$fitcss\s*:\s*\(/.exec(src);
if (!match) throw new Error('$fitcss map not found in _config.scss');

var i = match.index + match[0].length - 1, depth = 0, block = '';
for (; i < src.length; i++) {
    var c = src[i];
    if      (c === '(') { depth++; if (depth > 1) block += c; }
    else if (c === ')') { depth--; if (depth === 0) break; block += c; }
    else if (depth >= 1) block += c;
}

var config = parseMap(block);
fs.writeFileSync('config.js', 'module.exports = ' + JSON.stringify(config, null, 2) + ';\n');
console.log('\x1b[32m%s\x1b[0m', 'config.js written');

// Compile SCSS

if (!fs.existsSync(output_dir)) fs.mkdirSync(output_dir);

try {
    var result = sass.compile(sass_dir, { style: 'expanded' });
    fs.writeFileSync(output_css, result.css);
    console.log('\x1b[32m%s\x1b[0m', 'css written');
} catch(err) {
    console.log('\x1b[31m%s\x1b[0m', err);
}
