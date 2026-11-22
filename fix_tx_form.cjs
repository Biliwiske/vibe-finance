const fs = require('fs');

let code = fs.readFileSync('src/TransactionForms.tsx', 'utf8');

// add delete button to NewTransactionForm
const delBtn = `        <button onClick={handleSubmit} className="text-[#3282f6] font-medium text-base">
          Сохранить
        </button>`;
        
const newHeader = `        <div className="flex gap-4">
          {!isNew && <button onClick={onRemove} className="text-red-500 font-medium text-base">Удалить</button>}
          <button onClick={handleSubmit} className="text-[#3282f6] font-medium text-base">
            Сохранить
          </button>
        </div>`;
        
code = code.replace(delBtn, newHeader);

// make sure onRemove is destructured
if (!code.includes("onRemove, t,")) {
  code = code.replace("cancel, handleSubmit, t,", "cancel, handleSubmit, onRemove, t,");
}

fs.writeFileSync('src/TransactionForms.tsx', code);
