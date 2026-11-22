const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// Update AccountManager state to include bank
appTsx = appTsx.replace(
  "const [type, setType] = useState<AccountType>('checking');\n  const [interestRate, setInterestRate] = useState('');",
  "const [type, setType] = useState<AccountType>('checking');\n  const [interestRate, setInterestRate] = useState('');\n  const [bank, setBank] = useState<string>('none');"
);

// Update startAdding
appTsx = appTsx.replace(
  "setType('checking');\n    setInterestRate('');\n  };",
  "setType('checking');\n    setInterestRate('');\n    setBank('none');\n  };"
);

// Update startEditing
appTsx = appTsx.replace(
  "setType(acc.type || 'checking');\n    setInterestRate(acc.interestRate?.toString() || '');\n  };",
  "setType(acc.type || 'checking');\n    setInterestRate(acc.interestRate?.toString() || '');\n    setBank(acc.bank || 'none');\n  };"
);

// Update handleSubmit
appTsx = appTsx.replace(
  "interestRate: type !== 'cash' ? parsedRate : undefined\n     };",
  "interestRate: type !== 'cash' ? parsedRate : undefined,\n       bank\n     };"
);

// Update AccountForm props in AnimatePresence
appTsx = appTsx.replace(
  "interestRate={interestRate} setInterestRate={setInterestRate}",
  "interestRate={interestRate} setInterestRate={setInterestRate}\n            bank={bank} setBank={setBank}"
);

// Find the TypeIcon function inside AccountManager and add Bank Icon rendering logic if acc.bank is set
const oldTypeIcon = `  const TypeIcon = ({ t: accountType }: { t: AccountType }) => {
    if (accountType === 'savings') return <PiggyBank className="w-4 h-4" />;
    if (accountType === 'deposit') return <Landmark className="w-4 h-4" />;
    if (accountType === 'cash') return <Banknote className="w-4 h-4" />;
    if (accountType === 'crypto') return <Bitcoin className="w-4 h-4" />;
    if (accountType === 'debt') return <Handshake className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />; 
  };`;

const newTypeIcon = `  const AccountIcon = ({ acc }: { acc: Account }) => {
    if (acc.bank && acc.bank !== 'none') {
      const b = BANKS.find(x => x.id === acc.bank);
      if (b) {
        const Icon = b.icon;
        return (
          <div className={\`p-1.5 rounded-lg \${b.bg}\`}>
             <Icon className={\`w-3.5 h-3.5 \${b.color}\`} />
          </div>
        );
      }
    }
    const t = acc.type;
    let Icon = CreditCard;
    if (t === 'savings') Icon = PiggyBank;
    else if (t === 'deposit') Icon = Landmark;
    else if (t === 'cash') Icon = Banknote;
    else if (t === 'crypto') Icon = Bitcoin;
    else if (t === 'debt') Icon = Handshake;
    return (
       <div className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-neutral-400">
         <Icon className="w-3.5 h-3.5" />
       </div>
    );
  };`;

appTsx = appTsx.replace(oldTypeIcon, newTypeIcon);

// Find where TypeIcon is used and replace it
appTsx = appTsx.replace(
  '<TypeIcon t={acc.type || \'checking\'} />',
  '<AccountIcon acc={acc} />'
);
appTsx = appTsx.replace(
  '<div className="text-neutral-500">',
  '<div>'
);


fs.writeFileSync('src/App.tsx', appTsx);
