const fs = require('fs');

let code = fs.readFileSync('src/TransactionForms.tsx', 'utf8');

code = code.replace("import { Wallet, motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';");
code = code.replace("import { Wallet, formatMoney } from './App';", "import { formatMoney } from './App';");

fs.writeFileSync('src/TransactionForms.tsx', code);
