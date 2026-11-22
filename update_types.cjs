const fs = require('fs');

let typesTs = fs.readFileSync('src/types.ts', 'utf8');

typesTs += `
export type TransactionType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
};

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
};
`;

typesTs = typesTs.replace(
  'type?: AccountType;',
  'type?: AccountType;\n  bank?: string;'
);

fs.writeFileSync('src/types.ts', typesTs);
