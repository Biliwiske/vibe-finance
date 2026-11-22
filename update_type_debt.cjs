const fs = require('fs');

let code = fs.readFileSync('src/i18n.ts', 'utf8');

code = code.replace(
  'type_debt: "Debt (Owed to me)",',
  'type_debt: "Debt / Credit",'
);

code = code.replace(
  'type_debt: "Долги мне",',
  'type_debt: "Долг / Кредит",'
);

fs.writeFileSync('src/i18n.ts', code);
