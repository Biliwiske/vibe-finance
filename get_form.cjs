const fs = require('fs');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const getBlock = (start, end) => {
  const s = appTsx.indexOf(start);
  const e = appTsx.indexOf(end, s);
  if (s === -1 || e === -1) return null;
  return appTsx.substring(s, e);
};

console.log("TransactionForm length:", getBlock('function TransactionForm(', 'function CategoryForm(')?.length);
console.log("CategoryForm length:", getBlock('function CategoryForm(', 'function TransactionManager(')?.length);
console.log("TransactionManager length:", getBlock('function TransactionManager(', 'export default function App() {')?.length);
