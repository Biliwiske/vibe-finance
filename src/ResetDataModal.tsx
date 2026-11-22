import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Download, ShieldAlert, CheckCircle2, RefreshCw, Wallet, Repeat, CalendarDays, Target, Briefcase } from 'lucide-react';
import { Account, Payment, Goal, Purchase, Transaction, Category } from './types';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (options: {
    resetAccounts: boolean;
    resetTransactions: boolean;
    resetPayments: boolean;
    resetGoals: boolean;
    resetPurchases: boolean;
    resetSalary: boolean;
    resetCategories: boolean;
  }) => void;
  accounts: Account[];
  transactions: Transaction[];
  payments: Payment[];
  goals: Goal[];
  purchases: Purchase[];
  categories?: Category[];
  salary: number;
  currency: string;
  lang: string;
  t: (key: string) => string;
}

export function ResetDataModal({
  isOpen,
  onClose,
  onConfirmReset,
  accounts,
  transactions,
  payments,
  goals,
  purchases,
  categories = [],
  salary,
  currency,
  lang,
  t
}: ResetDataModalProps) {
  // Reset scopes
  const [resetAccounts, setResetAccounts] = useState(true);
  const [resetTransactions, setResetTransactions] = useState(true);
  const [resetPayments, setResetPayments] = useState(true);
  const [resetGoals, setResetGoals] = useState(true);
  const [resetPurchases, setResetPurchases] = useState(true);
  const [resetSalary, setResetSalary] = useState(false);
  const [resetCategories, setResetCategories] = useState(false);

  // Safety confirmation states
  const [confirmText, setConfirmText] = useState('');
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // Preset modes
  const [presetMode, setPresetMode] = useState<'full' | 'tx_only' | 'custom'>('full');

  const requiredWord = lang === 'ru' ? 'СБРОС' : 'RESET';
  const isWordConfirmed = confirmText.trim().toUpperCase() === requiredWord;

  // Can execute if user either checked the safety checkbox OR typed the required confirmation word
  // To ensure absolute certainty without friction, require the confirmation checkbox AND either matching word or explicit click
  const isConfirmationSatisfied = hasConfirmedCheckbox && (isWordConfirmed || confirmText.trim().toUpperCase() === 'СБРОС' || confirmText.trim().toUpperCase() === 'RESET');

  const applyPreset = (mode: 'full' | 'tx_only' | 'custom') => {
    setPresetMode(mode);
    if (mode === 'full') {
      setResetAccounts(true);
      setResetTransactions(true);
      setResetPayments(true);
      setResetGoals(true);
      setResetPurchases(true);
      setResetSalary(false);
      setResetCategories(false);
    } else if (mode === 'tx_only') {
      setResetAccounts(false);
      setResetTransactions(true);
      setResetPayments(false);
      setResetGoals(false);
      setResetPurchases(false);
      setResetSalary(false);
      setResetCategories(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        currency,
        salary,
        accounts,
        transactions,
        payments,
        goals,
        purchases,
        categories
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `vibe_finance_backup_before_reset_${dateStr}.json`;

      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);

      setBackupDownloaded(true);
    } catch (err) {
      console.error('Failed to download backup JSON:', err);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmationSatisfied) return;

    onConfirmReset({
      resetAccounts,
      resetTransactions,
      resetPayments,
      resetGoals,
      resetPurchases,
      resetSalary,
      resetCategories
    });

    // Reset local modal state
    setConfirmText('');
    setHasConfirmedCheckbox(false);
    onClose();
  };

  // Calculate items count that will be deleted
  const totalItemsToWipe = (
    (resetAccounts ? accounts.length : 0) +
    (resetTransactions ? transactions.length : 0) +
    (resetPayments ? payments.length : 0) +
    (resetGoals ? goals.length : 0) +
    (resetPurchases ? purchases.length : 0)
  );

  const hasAnySelected = resetAccounts || resetTransactions || resetPayments || resetGoals || resetPurchases || resetSalary || resetCategories;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 safe-area-overlay-compact bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-lg bg-[#161b22] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-tight">
                {lang === 'ru' ? 'Сброс счетов и операций' : 'Reset Accounts & Transactions'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru' ? 'Полное удаление финансовых данных с подтверждением' : 'Permanent financial data reset with verification'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#30363d]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleResetSubmit} className="overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {/* Warning Banner */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-red-400 text-xs">
                {lang === 'ru' ? 'Внимание! Это действие необратимо' : 'Warning! This action is irreversible'}
              </span>
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                {lang === 'ru'
                  ? 'Выбранные финансовые записи будут безвозвратно удалены из памяти браузера. Восстановить их можно будет только при наличии резервной копии.'
                  : 'Selected financial records will be permanently erased from browser storage. They cannot be restored unless you have a backup.'}
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-col gap-2">
            <span className="font-medium text-neutral-300">
              {lang === 'ru' ? 'Режим сброса:' : 'Reset mode:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('full')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  presetMode === 'full'
                    ? 'bg-red-500/15 border-red-500 text-white shadow-sm'
                    : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-red-300">
                    {lang === 'ru' ? 'Полный сброс' : 'Full Reset'}
                  </span>
                  {presetMode === 'full' && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <span className="text-[10px] text-neutral-400 mt-1">
                  {lang === 'ru' ? 'Счета, операции, платежи и цели' : 'Accounts, txs, payments & goals'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('tx_only')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  presetMode === 'tx_only'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                    : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-amber-300">
                    {lang === 'ru' ? 'Только операции' : 'Txs Only'}
                  </span>
                  {presetMode === 'tx_only' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-neutral-400 mt-1">
                  {lang === 'ru' ? 'Очистить историю расходов и доходов' : 'Clear income and expense history'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPresetMode('custom')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  presetMode === 'custom'
                    ? 'bg-neutral-800 border-neutral-500 text-white shadow-sm'
                    : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-neutral-200">
                    {lang === 'ru' ? 'Выборочно' : 'Custom'}
                  </span>
                  {presetMode === 'custom' && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />}
                </div>
                <span className="text-[10px] text-neutral-400 mt-1">
                  {lang === 'ru' ? 'Настроить галочками вручную' : 'Select individual data types'}
                </span>
              </button>
            </div>
          </div>

          {/* Scope Checkboxes */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {lang === 'ru' ? 'Данные для удаления:' : 'Data to delete:'}
            </span>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 cursor-pointer hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={resetAccounts}
                  onChange={(e) => {
                    setResetAccounts(e.target.checked);
                    setPresetMode('custom');
                  }}
                  className="rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4"
                />
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-neutral-200">
                    {lang === 'ru' ? 'Все счета и карты' : 'All Accounts & Cards'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {accounts.length} {lang === 'ru' ? 'счетов' : 'accs'}
              </span>
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 cursor-pointer hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={resetTransactions}
                  onChange={(e) => {
                    setResetTransactions(e.target.checked);
                    setPresetMode('custom');
                  }}
                  className="rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4"
                />
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-medium text-neutral-200">
                    {lang === 'ru' ? 'Все операции (история)' : 'All Transactions (History)'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {transactions.length} {lang === 'ru' ? 'операций' : 'records'}
              </span>
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 cursor-pointer hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={resetPayments}
                  onChange={(e) => {
                    setResetPayments(e.target.checked);
                    setPresetMode('custom');
                  }}
                  className="rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4"
                />
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-neutral-200">
                    {lang === 'ru' ? 'Регулярные платежи' : 'Recurring Payments'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {payments.length} {lang === 'ru' ? 'платежей' : 'payments'}
              </span>
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 cursor-pointer hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={resetGoals && resetPurchases}
                  onChange={(e) => {
                    setResetGoals(e.target.checked);
                    setResetPurchases(e.target.checked);
                    setPresetMode('custom');
                  }}
                  className="rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4"
                />
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-neutral-200">
                    {lang === 'ru' ? 'Цели и покупки' : 'Goals & Planned Purchases'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {goals.length + purchases.length} {lang === 'ru' ? 'записей' : 'items'}
              </span>
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 cursor-pointer hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={resetSalary}
                  onChange={(e) => {
                    setResetSalary(e.target.checked);
                    setPresetMode('custom');
                  }}
                  className="rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4"
                />
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-neutral-200">
                    {lang === 'ru' ? 'Сбросить зарплату в 0' : 'Reset Salary to 0'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {salary ? `${salary} ${currency}` : (lang === 'ru' ? 'не задана' : 'none')}
              </span>
            </label>
          </div>

          {/* Backup CTA Box */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-neutral-200 block">
                  {lang === 'ru' ? 'Сохранить резервную копию' : 'Save backup file'}
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  {backupDownloaded
                    ? (lang === 'ru' ? '✓ Резервная копия скачана!' : '✓ Backup downloaded!')
                    : (lang === 'ru' ? 'Скачайте JSON перед удалением на случай ошибки' : 'Download JSON before reset just in case')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
                backupDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#161b22] text-neutral-200 hover:text-white border border-[#30363d] hover:border-emerald-500/50'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Скачать .JSON' : 'Download .JSON'}</span>
            </button>
          </div>

          {/* Verification Step */}
          <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-semibold text-red-300">
              {lang === 'ru' ? 'Подтверждение удаления' : 'Confirmation required'}
            </span>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfirmedCheckbox}
                onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-[#30363d] text-red-500 focus:ring-red-500/40 bg-[#0d1117] w-4 h-4 shrink-0"
              />
              <span className="text-xs text-neutral-200 select-none leading-relaxed">
                {lang === 'ru'
                  ? 'Я подтверждаю сброс и понимаю, что удалённые данные нельзя будет восстановить.'
                  : 'I confirm the reset and acknowledge that deleted data cannot be recovered.'}
              </span>
            </label>

            {/* Verification word */}
            <div className="flex flex-col gap-1 pt-1">
              <label className="text-[11px] text-neutral-300">
                {lang === 'ru'
                  ? <>Введите слово <strong className="text-red-400 font-mono">СБРОС</strong> для разблокировки:</>
                  : <>Type <strong className="text-red-400 font-mono">RESET</strong> to unlock:</>}
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requiredWord}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white font-mono tracking-wider outline-none focus:border-red-500 transition-colors uppercase"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-[#0d1117] border border-[#30363d] hover:bg-[#30363d]/40 transition-colors"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={!isConfirmationSatisfied || !hasAnySelected}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                isConfirmationSatisfied && hasAnySelected
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_16px_rgba(220,38,38,0.4)] cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {lang === 'ru'
                  ? (presetMode === 'full' ? 'Удалить все счета и операции' : 'Удалить выбранные данные')
                  : (presetMode === 'full' ? 'Reset All Accounts & Txs' : 'Delete Selected Data')}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
