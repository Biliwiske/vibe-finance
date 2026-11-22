const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// The line is: const { salary, setSalary, accounts, addAccount, editAccount, removeAccount, payments, addPayment, editPayment, removePayment, togglePaymentActive, goals, addGoal, editGoal, removeGoal, purchases, addPurchase, editPurchase, removePurchase } = useFinanceStore();

// Let's replace the whole const { ... } = useFinanceStore() block cleanly.

const storeCallRegex = /const\s+\{\s*[\s\S]*?\s*\}\s*=\s*useFinanceStore\(\);/g;

const newStoreCall = `const {
    salary, setSalary,
    accounts, addAccount, editAccount, removeAccount,
    payments, addPayment, editPayment, removePayment, togglePaymentActive,
    goals, addGoal, editGoal, removeGoal,
    purchases, addPurchase, editPurchase, removePurchase,
    transactions, addTransaction, removeTransaction,
    categories, addCategory
  } = useFinanceStore();`;

appTsx = appTsx.replace(storeCallRegex, newStoreCall);

// BANKS needs to be passed down or available.
// BANKS is defined in App.tsx right before AccountForm.
// Wait, AccountForm is declared in App.tsx. I can move BANKS to the top level.
if (appTsx.includes('const BANKS =')) {
  // Extract it and move to top, or it is already at top?
  // I injected it right before AccountForm which is at top level.
  // Oh, AccountIcon is inside AccountManager! It can see BANKS if BANKS is outside.
  // Yes, I defined it outside. Let me check if it's there.
}

fs.writeFileSync('src/App.tsx', appTsx);
