import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, DollarSign, CreditCard, TrendingUp, Settings, Plus, Minus, BarChart3, Target,
  ArrowUpDown, Check, Clock, AlertTriangle, ChevronDown, ChevronUp, Edit, Trash2, Save, X,
  Download, Upload, Zap, Calculator, PieChart, LineChart, RotateCcw, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle
} from 'lucide-react';
import Modal from '../../components/shared/Modal.jsx';
import { useExpenseStore } from '../../store/expenseStore.js';
import { formatCurrency, formatDate } from '../../utils/formatting.js';
import { calculatePeriodTotals, calculateDebtPayoff } from '../../utils/calculations.js';
import { getAnalyticsData } from '../../utils/analytics.js';
import { exportToCSV } from '../../utils/export.js';
import DebtPayoffTools from '../Debt/DebtPayoffTools.jsx';
import DebtSummary from '../Debt/DebtSummary.jsx';
import AdvancedAnalytics from '../Analytics/AdvancedAnalytics.jsx';
import QuickAnalytics from '../Analytics/QuickAnalytics.jsx';
import IncomeSettings from '../Income/IncomeSettings.jsx';
import SourceExpenseManagement from '../Expenses/SourceExpenseManagement.jsx';
import ExpenseItem from '../Expenses/ExpenseItem.jsx';
import ExpenseEditModal from '../Expenses/ExpenseEditModal.jsx';
import PeriodHeader from './components/PeriodHeader.jsx';
import ViewControls from './components/ViewControls.jsx';
import OnboardingModal from '../../components/shared/OnboardingModal.jsx';
import CelebrationToast from '../../components/shared/CelebrationToast.jsx';
import SinglePeriodView from './views/SinglePeriodView.jsx';
import SideBySideView from './views/SideBySideView.jsx';
import DashboardView from './views/DashboardView.jsx';

const SIDE_BY_SIDE_COUNT = 4;

const ExpenseManager = () => {
  const {
    sourceExpenses, incomeSettings, periods, currentView, selectedPeriod,
    debtStrategy, extraPayment, undoStack, showDebtTools, showAnalytics,
    showSourceManagement, showIncomeSettings, editingExpense, oneOffModal,
    showOnboarding, expenseModal, celebration,
    setSourceExpenses, setIncomeSettings, setPeriods, setCurrentView,
    setSelectedPeriod, setDebtStrategy, setExtraPayment, setUndoStack,
    setShowDebtTools, setShowAnalytics, setShowSourceManagement,
    setShowIncomeSettings, setEditingExpense, setOneOffModal,
    setShowOnboarding, setExpenseModal, triggerCelebration,
    addOneOff, updateOneOff, generatePeriods, updateIncomeInPeriods,
    moveExpense, handleUndo, updateExpenseStatus, handleExpenseModalSave,
    deleteEditingExpense, closeOnboarding
  } = useExpenseStore();

  // ---------- Capability checks ----------
  const fsSupported = typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window;

  // ---------- Date helpers ----------
  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return new Date(t);
    }
    if (v && typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
    return null;
  };

  // ---------- Local storage helpers ----------

  // ---------- Import/Export & Sync helpers ----------
  const packAppState = () => ({
    sourceExpenses,
    incomeSettings,
    periods,
    currentView,
    selectedPeriod,
    debtStrategy,
    extraPayment,
    undoStack,
    lastSaveError,
    lastSavedAt,
    version: 1
  });

  const applyAppState = (data) => {
    if (!data || typeof data !== 'object') return;
    setSourceExpenses(Array.isArray(data.sourceExpenses) ? data.sourceExpenses : []);
    setIncomeSettings(data.incomeSettings || incomeSettings);
    const rehydratedPeriods = Array.isArray(data.periods)
      ? data.periods.map(p => ({
        ...p,
        startDate: toDate(p.startDate),
        endDate: toDate(p.endDate),
        expenses: Array.isArray(p.expenses) ? p.expenses.map(e => ({ ...e })) : [],
        oneOffExpenses: Array.isArray(p.oneOffExpenses) ? p.oneOffExpenses.map(e => ({ ...e })) : []
      }))
      : [];
    setPeriods(rehydratedPeriods);
    setCurrentView(data.currentView || 'single');
    setSelectedPeriod(Number.isInteger(data.selectedPeriod) ? data.selectedPeriod : 0);
    setDebtStrategy(data.debtStrategy || 'avalanche');
    setExtraPayment(data.extraPayment ?? 0);
    setUndoStack(Array.isArray(data.undoStack) ? data.undoStack : []);
    setLastSaveError(data.lastSaveError || '');
    setLastSavedAt(data.lastSavedAt ? toDate(data.lastSavedAt) : null);
  };

  function exportAppStateJSON() {
    const blob = new Blob([JSON.stringify(packAppState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-planner.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importAppStateJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyAppState(data);
      triggerCelebration('Successfully imported your data! 🎉');
    } catch (e) {
      console.error('Import failed:', e);
      alert('Import failed. Please check the file.');
    }
  }

  // ---------- Live file sync (File System Access API) ----------
  // This logic will be moved to the store or a separate hook later.
  const [syncHandle, setSyncHandle] = useState(null);
  const [lastSaveError, setLastSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  async function writeSyncFile(handle, obj) {
    const writable = await handle.createWritable();
    await writable.write(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    await writable.close();
  }

  async function readSyncFile(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async function connectSyncFile() {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'expense-planner.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      setSyncHandle(handle);
      await writeSyncFile(handle, packAppState());
      setLastSavedAt(new Date());
      setLastSaveError('');
      triggerCelebration('Sync file connected! Your data will auto-save ✨');
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error('❌ Failed to connect sync file:', e);
        setLastSaveError('Could not connect to file.');
      }
    }
  }

  async function loadFromSyncFile() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      setSyncHandle(handle);
      const data = await readSyncFile(handle);
      applyAppState(data);
      setLastSaveError('');
      triggerCelebration('Data loaded and sync enabled! 🚀');
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error(e);
        setLastSaveError('Could not open sync file.');
      }
    }
  }

  const saveDebounceRef = useRef(null);
  useEffect(() => {
    if (!syncHandle) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        await writeSyncFile(syncHandle, packAppState());
        setLastSavedAt(new Date());
        setLastSaveError('');
      } catch (e) {
        setLastSaveError('Autosave failed (check permissions/storage).');
      }
    }, 600);
    return () => clearTimeout(saveDebounceRef.current);
  }, [syncHandle, sourceExpenses, incomeSettings, periods, currentView, selectedPeriod, debtStrategy, extraPayment, packAppState]);

  const categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other'];

  // ---------- Celebration helper ----------
  const triggerCelebration = (message) => {
    setCelebration({ show: true, message });
    setTimeout(() => setCelebration({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    generatePeriods();
  }, [sourceExpenses, incomeSettings.startDate, incomeSettings.firstPaycheckType, generatePeriods]);

  useEffect(() => {
    if (periods.length > 0) {
      updateIncomeInPeriods();
    }
  }, [incomeSettings.paycheckA, incomeSettings.paycheckB, periods.length, updateIncomeInPeriods]);

  // ---------- CRUD helpers ----------
  const handleEditExpense = (expense) => setEditingExpense(expense);
  const handleDeleteExpense = (expenseId) =>
    setSourceExpenses(sourceExpenses.map(exp => exp.id === expenseId ? { ...exp, active: false } : exp));

  // ---------- UI subcomponents ----------











  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration Toast */}
      <CelebrationToast />

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-blue-600" /> Expense & Paycheck Planner
              </h1>

              {/* Right-side controls - Better organized */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Primary Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setShowIncomeSettings(true)} className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2 hover:bg-green-700">
                    <DollarSign className="w-4 h-4" /> Income Settings
                  </button>
                  <button onClick={() => setShowSourceManagement(true)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2 hover:bg-blue-700">
                    <Edit className="w-4 h-4" /> Manage Expenses
                  </button>
                </div>

                {/* Analytics & Tools */}
                <div className="flex gap-2">
                  <button onClick={() => setShowAnalytics(!showAnalytics)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <BarChart3 className="w-4 h-4" /> Analytics
                  </button>
                  <button onClick={() => setShowDebtTools(!showDebtTools)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${showDebtTools ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <Target className="w-4 h-4" /> Debt Tools
                  </button>
                </div>

                {/* Data Management */}
                <div className="flex gap-2 border-l pl-2">
                  {/* Data controls: prefer live file sync when supported; otherwise fall back to JSON import/export */}
                  {fsSupported ? (
                    // Browser supports File System Access API (Chrome/Edge desktop).
                    <>
                      {!syncHandle && (
                        <>
                          <button
                            onClick={connectSyncFile}
                            className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center gap-2 hover:bg-indigo-700"
                            title="Pick a JSON in a cloud-synced folder to auto-save into"
                          >
                            <Upload className="w-4 h-4" />
                            Connect Sync File
                          </button>
                          <button
                            onClick={loadFromSyncFile}
                            className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded text-sm hover:bg-indigo-200"
                            title="Load existing JSON and enable autosave"
                          >
                            Load From Sync File
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    // Browser does NOT support File System Access API (Safari/iOS, most mobile).
                    <div className="flex gap-2">
                      <button
                        onClick={exportAppStateJSON}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        title="Download current state as JSON"
                      >
                        Export State JSON
                      </button>

                      <label
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm cursor-pointer hover:bg-gray-200"
                        title="Import a previously exported JSON file"
                      >
                        Import State JSON
                        <input
                          type="file"
                          accept="application/json"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && importAppStateJSON(e.target.files[0])}
                        />
                      </label>
                    </div>
                  )}

                  <button onClick={() => exportToCSV(periods)} className="px-3 py-2 bg-teal-600 text-white rounded text-sm flex items-center gap-2 hover:bg-teal-700">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>

                {/* Danger Zone */}
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center gap-2 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>

            {/* Autosave status line */}
            {syncHandle && (
              <div className="text-xs text-gray-600 flex items-center gap-3">
                <span>Autosaving to connected file…</span>
                {lastSavedAt && <span className="text-green-700">Last saved: {formatDate(lastSavedAt)}</span>}
                {lastSaveError && <span className="text-red-600">Error: {lastSaveError}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overlay Modals */}
        <Modal
          isOpen={showSourceManagement}
          onClose={() => setShowSourceManagement(false)}
          title="Source of Truth Expenses"
          maxWidth="max-w-6xl"
        >
          <SourceExpenseManagement onClose={() => setShowSourceManagement(false)} />
        </Modal>

        <Modal
          isOpen={showIncomeSettings}
          onClose={() => setShowIncomeSettings(false)}
          title="Income & Schedule Settings"
        >
          <IncomeSettings onClose={() => setShowIncomeSettings(false)} />
        </Modal>

        <Modal
          isOpen={showDebtTools}
          onClose={() => setShowDebtTools(false)}
          title="Debt Payoff Calculator"
        >
          <DebtPayoffTools onClose={() => setShowDebtTools(false)} />
        </Modal>

        <Modal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          title="Financial Analytics"
          maxWidth="max-w-6xl"
        >
          <AdvancedAnalytics onClose={() => setShowAnalytics(false)} />
        </Modal>

        {oneOffModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setOneOffModal({ open: false, periodId: null, editingId: null, fields: null })}>
            <div className="bg-white rounded-lg p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold mb-3">
                {oneOffModal.editingId ? 'Edit One-Off' : 'Add One-Off'}
              </h3>

              <div className="space-y-3">
                <input
                  placeholder="Description"
                  className="w-full border rounded px-2 py-1"
                  value={oneOffModal.fields?.description || ''}
                  onChange={e => setOneOffModal(m => ({ ...m, fields: { ...m.fields, description: e.target.value } }))}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  className="w-full border rounded px-2 py-1"
                  value={oneOffModal.fields?.amount || ''}
                  onChange={e => setOneOffModal(m => ({ ...m, fields: { ...m.fields, amount: parseFloat(e.target.value || 0) } }))}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-2 text-sm bg-gray-100 rounded"
                  onClick={() => setOneOffModal({ open: false, periodId: null, editingId: null, fields: null })}>
                  Cancel
                </button>
                <button
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                  disabled={!oneOffModal.fields?.description || !oneOffModal.fields?.amount}
                  onClick={() => {
                    addOneOff(oneOffModal.periodId, oneOffModal.fields);
                    setOneOffModal({ open: false, periodId: null, editingId: null, fields: null });
                    triggerCelebration('One-off expense added! 📋');
                  }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}

        <ExpenseEditModal />

        <ViewControls />

        {currentView === 'single' && <SinglePeriodView />}
        {currentView === 'side-by-side' && <SideBySideView />}
        {currentView === 'dashboard' && <DashboardView />}
      </div>
    </div>
  );
};

export default ExpenseManager;