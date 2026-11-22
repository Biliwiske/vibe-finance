const fs = require('fs');

let code = fs.readFileSync('src/TransactionForms.tsx', 'utf8');

// add formatMoney
code = code.replace(
  "import { motion, AnimatePresence } from 'motion/react';",
  "import { motion, AnimatePresence } from 'motion/react';\nimport { formatMoney } from './App';"
);

fs.writeFileSync('src/TransactionForms.tsx', code);
