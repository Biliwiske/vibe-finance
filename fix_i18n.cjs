const fs = require('fs');

let code = fs.readFileSync('src/i18n.ts', 'utf8');

// There are duplicate keys for accounts_dist etc. because I probably ran the replace twice or it already existed.
// I'll just remove the duplicate block.

// Find the occurrences of "// Analytics"
const analyticsBlocks = code.match(/\/\/ Analytics/g);
if (analyticsBlocks && analyticsBlocks.length > 2) {
    // We have duplicates! Let's just fix it by replacing the whole i18n file or removing the duplicate string.
}
