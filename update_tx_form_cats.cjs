const fs = require('fs');
let code = fs.readFileSync('src/TransactionForms.tsx', 'utf8');

// Add t to FullCategorySelector
code = code.replace(
  'export function FullCategorySelector({ type, categories, onSelect, onAdd, onClose }: any) {',
  'export function FullCategorySelector({ type, categories, onSelect, onAdd, onClose, t }: any) {'
);

// In FullCategorySelector, use t(cat.name)
code = code.replace(
  '<span className="text-xs text-center text-neutral-300 leading-tight">{cat.name}</span>',
  '<span className="text-xs text-center text-neutral-300 leading-tight">{t(cat.name)}</span>'
);

// Also use t(cat.name) in NewTransactionForm quick categories
code = code.replace(
  '<span className="text-xs text-center text-neutral-300 leading-tight w-16 truncate">{cat.name}</span>',
  '<span className="text-xs text-center text-neutral-300 leading-tight w-16 truncate">{t(cat.name)}</span>'
);

// Pass t to FullCategorySelector in NewTransactionForm
code = code.replace(
  '<FullCategorySelector \n            type={type} \n            categories={categories} \n            onSelect={(id: string) => setCategoryId(id)}\n            onAdd={() => { setShowCatSelector(false); onAddCategory(); }}\n            onClose={() => setShowCatSelector(false)}\n          />',
  '<FullCategorySelector \n            type={type} \n            categories={categories} \n            onSelect={(id: string) => setCategoryId(id)}\n            onAdd={() => { setShowCatSelector(false); onAddCategory(); }}\n            onClose={() => setShowCatSelector(false)}\n            t={t}\n          />'
);

fs.writeFileSync('src/TransactionForms.tsx', code);
