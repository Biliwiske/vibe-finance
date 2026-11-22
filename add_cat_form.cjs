const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// The original CategoryForm from a backup? I deleted it!
// Let's rewrite a simple CategoryForm for now in App.tsx or TransactionForms.tsx
const catForm = `export function CategoryForm({ type, name, setName, icon, setIcon, cancel, handleSubmit, t }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={cancel}>
      <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-medium text-white">Новая категория</h3>
        <input 
          type="text" 
          placeholder="Название"
          value={name} 
          onChange={e => setName(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={cancel} className="px-4 py-2 text-sm text-neutral-400">Отмена</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-500 text-black rounded-xl font-medium">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
`;

let forms = fs.readFileSync('src/TransactionForms.tsx', 'utf8');
if (!forms.includes("export function CategoryForm")) {
  forms += "\n" + catForm;
  fs.writeFileSync('src/TransactionForms.tsx', forms);
}

app = app.replace(
  "import { NewTransactionForm as TransactionForm } from './TransactionForms';",
  "import { NewTransactionForm as TransactionForm, CategoryForm } from './TransactionForms';"
);
fs.writeFileSync('src/App.tsx', app);
