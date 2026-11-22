const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(
    '<div className="flex h-screen w-full bg-[#0d1117] text-neutral-200 overflow-hidden font-sans">',
    '<div className="flex flex-col md:flex-row h-screen w-full bg-[#0d1117] text-neutral-200 overflow-hidden font-sans">'
);
appTsx = appTsx.replace(
    '<aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">',
    '<aside className="w-full md:w-64 bg-[#161b22] border-b md:border-b-0 md:border-r border-[#30363d] flex flex-col shrink-0 z-20">'
);
appTsx = appTsx.replace(
    '<div className="p-6 flex items-center gap-3 border-b border-[#30363d] shrink-0">',
    '<div className="p-4 md:p-6 flex items-center gap-3 border-b border-[#30363d] shrink-0">'
);
appTsx = appTsx.replace(
    '<nav className="flex-1 overflow-y-auto p-4 space-y-1.5 compact-scrollbar">',
    '<nav className="flex-none md:flex-1 overflow-x-auto md:overflow-y-auto p-3 md:p-4 flex flex-row md:flex-col gap-2 space-y-0 md:space-y-1.5 compact-scrollbar">'
);

// We need to fix the button classes to not be w-full on mobile
appTsx = appTsx.replace(/className={\`w-full /g, 'className={`flex-none md:w-full ');

appTsx = appTsx.replace(
    '<div className="p-4 border-t border-[#30363d] flex flex-col gap-3 shrink-0">',
    '<div className="hidden md:flex p-4 border-t border-[#30363d] flex-col gap-3 shrink-0">'
);

// Add mobile language/currency to the header so it's not hidden
appTsx = appTsx.replace(
    `<h1 className="text-xl font-semibold tracking-tight text-white">{t('app_title')}</h1>`,
    `<h1 className="text-xl font-semibold tracking-tight text-white mr-auto">{t('app_title')}</h1>
          <div className="flex md:hidden items-center gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'ru')} className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-300 outline-none">
              <option value="en">EN</option><option value="ru">RU</option>
            </select>
          </div>`
);


fs.writeFileSync('src/App.tsx', appTsx);
