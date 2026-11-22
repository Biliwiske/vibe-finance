const fs = require('fs');
const content = fs.readFileSync('src/index.css', 'utf8');
console.log(content.includes('tailwindcss'));
