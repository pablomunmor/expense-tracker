import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, DollarSign, CreditCard, TrendingUp, Settings, Plus, Minus, BarChart3, Target,
  ArrowUpDown, Check, Clock, AlertTriangle, ChevronDown, ChevronUp, Edit, Trash2, Save, X,
  Download, Upload, Zap, Calculator, PieChart, LineChart, RotateCcw, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle
} from 'lucide-react';
import ExpenseForm from './ExpenseForm';

const SIDE_BY_SIDE_COUNT = 4;

// ---- One-off helpers (lightweight; no new libs needed) ----
const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function ensureOneOffArray(periods) {
  // safe-guard so older periods get the new array
  periods.forEach(p => { if (!p.oneOffExpenses) p.oneOffExpenses = []; });
}

function addOneOff(periods, setPeriods, periodId, fields) {
  setPeriods(prev => {
    const copy = structuredClone(prev);
    const p = copy.find(x => x.id === periodId);
    if (!p.oneOffExpenses) p.oneOffExpenses = [];
    p.oneOffExpenses.push({
      id: makeId(),
      isOneOff: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
      description: '',
      amount: 0,
      category: 'Other',
      notes: '',
      ...fields
    });
    return copy;
  });
}

function updateOneOff(periods, setPeriods, periodId, id, patch) {
  setPeriods(prev => {
    const copy = structuredClone(prev);
    const p = copy.find(x => x.id === periodId);
    const i = (p.oneOffExpenses || []).findIndex(e => e.id === id);
    if (i >= 0) p.oneOffExpenses[i] = { ...p.oneOffExpenses[i], ...patch, updatedAt: new Date().toISOString() };
    return copy;
  });
}

function deleteOneOff(periods, setPeriods, periodId, id) {
  setPeriods(prev => {
    const copy = structuredClone(prev);
    const p = copy.find(x => x.id === periodId);
    p.oneOffExpenses = (p.oneOffExpenses || []).filter(e => e.id !== id);
    return copy;
  });
}

const ExpenseTrackingApp = () => {
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
  const loadFromStorage = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);

        if (key === 'expenseTracker_incomeSettings' && parsed.startDate) {
          parsed.startDate = toDate(parsed.startDate);
          return parsed;
        }

        if (key === 'expenseTracker_periods' && Array.isArray(parsed)) {
          return parsed.map(p => ({
            ...p,
            startDate: toDate(p.startDate),
            endDate: toDate(p.endDate),
            expenses: Array.isArray(p.expenses) ? p.expenses.map(e => ({ ...e })) : [],
            // ✅ Ensure the new field always exists after load
            oneOffExpenses: Array.isArray(p.oneOffExpenses) ? p.oneOffExpenses.map(e => ({ ...e })) : []
          }));
        }
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  // ---------- Core state ----------
  const [sourceExpenses, setSourceExpenses] = useState(() =>
    loadFromStorage('expenseTracker_sourceExpenses', [
      { id: 1, description: 'Rent', category: 'Housing', amount: 1200, dueDate: 1, paycheckAssignment: 'A', isDebt: false, active: true },
      { id: 2, description: 'Credit Card', category: 'Debt', amount: 150, dueDate: 15, paycheckAssignment: 'B', isDebt: true, balance: 3500, apr: 18.5, minimumPayment: 150, active: true },
      { id: 3, description: 'Groceries', category: 'Food', amount: 400, dueDate: 10, paycheckAssignment: 'A', isDebt: false, active: true },
      { id: 4, description: 'Car Payment', category: 'Transportation', amount: 350, dueDate: 20, paycheckAssignment: 'B', isDebt: true, balance: 8500, apr: 4.5, minimumPayment: 350, active: true },
      { id: 5, description: 'Utilities', category: 'Housing', amount: 150, dueDate: 5, paycheckAssignment: 'A', isDebt: false, active: true },
      { id: 6, description: 'Student Loan', category: 'Debt', amount: 200, dueDate: 25, paycheckAssignment: 'B', isDebt: true, balance: 15000, apr: 6.8, minimumPayment: 200, active: true },
    ])
  );

  const [incomeSettings, setIncomeSettings] = useState(() =>
    loadFromStorage('expenseTracker_incomeSettings', {
      paycheckA: 2800,
      paycheckB: 2800,
      startDate: new Date(),
      firstPaycheckType: 'A'
    })
  );

  const [periods, setPeriods] = useState(() => loadFromStorage('expenseTracker_periods', []));
  const [currentView, setCurrentView] = useState(() => loadFromStorage('expenseTracker_currentView', 'single'));
  const [selectedPeriod, setSelectedPeriod] = useState(() => loadFromStorage('expenseTracker_selectedPeriod', 0));

  const [showDebtTools, setShowDebtTools] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSourceManagement, setShowSourceManagement] = useState(false);
  const [showIncomeSettings, setShowIncomeSettings] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [oneOffModal, setOneOffModal] = useState({ open: false, periodId: null, editingId: null, fields: null });

  // New state for expense editing modal
  const [expenseModal, setExpenseModal] = useState({ open: false, expense: null, periodId: null });

  // Celebration animation state
  const [celebration, setCelebration] = useState({ show: false, message: '' });

  const [debtStrategy, setDebtStrategy] = useState(() => loadFromStorage('expenseTracker_debtStrategy', 'avalanche'));
  const [extraPayment, setExtraPayment] = useState(() => loadFromStorage('expenseTracker_extraPayment', 0));

  // ---------- Import/Export & Sync helpers ----------
  const packAppState = () => ({
    sourceExpenses,
    incomeSettings,
    periods,
    currentView,
    selectedPeriod,
    debtStrategy,
    extraPayment,
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
        console.error(e);
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
    // Debounce saves to avoid excessive writes during rapid updates
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        await writeSyncFile(syncHandle, packAppState());
        setLastSavedAt(new Date());
        setLastSaveError('');
      } catch (e) {
        console.error('Autosave failed:', e);
        setLastSaveError('Autosave failed (check permissions/storage).');
      }
    }, 600);
    return () => clearTimeout(saveDebounceRef.current);
    // We want to re-save on any meaningful state change:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncHandle, sourceExpenses, incomeSettings, periods, currentView, selectedPeriod, debtStrategy, extraPayment]);

  // ---------- Persist core state to localStorage ----------
  useEffect(() => { saveToStorage('expenseTracker_sourceExpenses', sourceExpenses); }, [sourceExpenses]);
  useEffect(() => { saveToStorage('expenseTracker_incomeSettings', incomeSettings); }, [incomeSettings]);
  useEffect(() => { saveToStorage('expenseTracker_periods', periods); }, [periods]);
  useEffect(() => { saveToStorage('expenseTracker_currentView', currentView); }, [currentView]);
  useEffect(() => { saveToStorage('expenseTracker_selectedPeriod', selectedPeriod); }, [selectedPeriod]);
  useEffect(() => { saveToStorage('expenseTracker_debtStrategy', debtStrategy); }, [debtStrategy]);
  useEffect(() => { saveToStorage('expenseTracker_extraPayment', extraPayment); }, [extraPayment]);

  const categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other'];

  // ---------- Celebration helper ----------
  const triggerCelebration = (message) => {
    setCelebration({ show: true, message });
    setTimeout(() => setCelebration({ show: false, message: '' }), 3000);
  };

  // ---------- Period generation ----------
  const generatePeriods = useCallback(() => {
    setPeriods(prevPeriods => {
      const generatedPeriods = [];
      for (let i = 0; i < 24; i++) {
        const startBase = toDate(incomeSettings.startDate) || new Date();
        const periodDate = new Date(startBase);
        periodDate.setDate(startBase.getDate() + (i * 14));

        const isAPaycheck = incomeSettings.firstPaycheckType === 'A' ? i % 2 === 0 : i % 2 === 1;

        const relevantExpenses = sourceExpenses
          .filter(exp => exp.active && exp.paycheckAssignment === (isAPaycheck ? 'A' : 'B'))
          .map(exp => ({
            ...exp,
            periodId: i,
            status: 'pending',
            amountCleared: exp.amount,
            position: Math.random()
          }));

        // Check if existing period has one-off expenses to preserve
        const existingPeriod = prevPeriods.find(p => p.id === i);
        const existingOneOffs = existingPeriod?.oneOffExpenses || [];

        generatedPeriods.push({
          id: i,
          type: isAPaycheck ? 'A' : 'B',
          startDate: new Date(periodDate),
          endDate: new Date(periodDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          defaultIncome: isAPaycheck ? incomeSettings.paycheckA : incomeSettings.paycheckB,
          additionalIncome: 0,
          expenses: relevantExpenses,
          status: 'active',
          // ✅ Preserve existing one-off expenses
          oneOffExpenses: existingOneOffs
        });
      }
      return generatedPeriods;
    });
  }, [sourceExpenses, incomeSettings]);

  useEffect(() => {
    // Ensure one-off arrays exist before generating periods
    ensureOneOffArray(periods);
    generatePeriods();
  }, [generatePeriods]);

  useEffect(() => {
    if (periods.length > 0) {
      // Ensure one-off arrays exist and update income
      ensureOneOffArray(periods);
      setPeriods(prev => prev.map(period => ({
        ...period,
        defaultIncome: period.type === 'A' ? incomeSettings.paycheckA : incomeSettings.paycheckB,
        oneOffExpenses: period.oneOffExpenses || [] // Ensure this always exists
      })));
    }
  }, [incomeSettings]);

  // ---------- Utils ----------
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (value) => {
    const d = toDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculatePeriodTotals = (period) => {
    // Income stays the same
    const totalIncome = period.defaultIncome + period.additionalIncome;

    // Make sure both arrays exist
    const baseExpenses = period.expenses || [];
    const oneOffs = period.oneOffExpenses || [];

    // Expenses
    const totalExpenses =
      baseExpenses.reduce((sum, exp) => sum + exp.amount, 0) +
      oneOffs.reduce((sum, exp) => sum + exp.amount, 0);

    // Paid (includes both 'paid' and 'cleared' status)
    const totalPaid =
      baseExpenses
        .filter(exp => exp.status === 'paid' || exp.status === 'cleared')
        .reduce((sum, exp) => sum + (exp.amountCleared ?? exp.amount), 0) +
      oneOffs
        .filter(exp => exp.status === 'paid' || exp.status === 'cleared')
        .reduce((sum, exp) => sum + exp.amount, 0);

    // Unpaid (only pending expenses - 'paid' expenses are considered committed but not yet cleared)
    const unpaidAmount =
      baseExpenses
        .filter(exp => exp.status === 'pending' || exp.status === 'paid')
        .reduce((sum, exp) => sum + exp.amount, 0) +
      oneOffs
        .filter(exp => exp.status === 'pending' || exp.status === 'paid')
        .reduce((sum, exp) => sum + exp.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      totalPaid,
      unpaidAmount,
      difference: totalIncome - totalExpenses,
      remainingAfterPaid: totalIncome - totalPaid
    };
  };

  const calculateDebtPayoff = () => {
    const debtExpenses = sourceExpenses.filter(exp => exp.isDebt && exp.active);
    const totalDebt = debtExpenses.reduce((sum, exp) => sum + exp.balance, 0);
    const monthlyPayments = debtExpenses.reduce((sum, exp) => sum + exp.minimumPayment, 0);

    const sortedDebts = [...debtExpenses].sort((a, b) => {
      if (debtStrategy === 'snowball') return a.balance - b.balance;
      if (debtStrategy === 'avalanche') return b.apr - a.apr;
      return 0;
    });

    let totalInterest = 0;
    let month = 0;
    let remainingDebts = sortedDebts.map(debt => ({ ...debt }));
    const totalExtraPayment = parseFloat(extraPayment) || 0;

    while (remainingDebts.length > 0 && month < 360) {
      month++;
      let extraThisMonth = totalExtraPayment;

      remainingDebts.forEach((debt, index) => {
        const monthlyInterest = (debt.balance * debt.apr / 100) / 12;
        totalInterest += monthlyInterest;

        let payment = debt.minimumPayment;
        if (index === 0 && extraThisMonth > 0) {
          payment += extraThisMonth;
          extraThisMonth = 0;
        }

        const principalPayment = Math.min(payment - monthlyInterest, debt.balance);
        debt.balance = Math.max(0, debt.balance - principalPayment);
      });

      remainingDebts = remainingDebts.filter(debt => debt.balance > 0);
    }

    return { totalDebt, monthlyPayments, payoffMonths: month, totalInterest, sortedDebts };
  };

  // ---------- Move expense between periods ----------
  const moveExpense = (expense, fromPeriodId, direction) => {
    const fromPeriodIndex = periods.findIndex(p => p.id === fromPeriodId);
    const toPeriodIndex = direction === 'forward' ? fromPeriodIndex + 1 : fromPeriodIndex - 1;

    if (toPeriodIndex < 0 || toPeriodIndex >= periods.length) return;

    const toPeriodId = periods[toPeriodIndex].id;
    const directionText = direction === 'forward' ? 'next' : 'previous';

    if (!confirm(`Move "${expense.description}" to the ${directionText} paycheck?`)) return;

    setUndoStack(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(periods))]);

    setPeriods(prev => {
      const newPeriods = structuredClone(prev);
      const fromPeriod = newPeriods.find(p => p.id === fromPeriodId);
      const toPeriod = newPeriods.find(p => p.id === toPeriodId);

      if (expense.isOneOff) {
        // Move one-off expense
        fromPeriod.oneOffExpenses = fromPeriod.oneOffExpenses.filter(e => e.id !== expense.id);
        toPeriod.oneOffExpenses.push({
          ...expense,
          periodId: toPeriodId,
          status: 'pending',
          updatedAt: new Date().toISOString()
        });
      } else {
        // Move regular expense
        fromPeriod.expenses = fromPeriod.expenses.filter(e => e.id !== expense.id);
        toPeriod.expenses.push({
          ...expense,
          periodId: toPeriodId,
          status: 'pending'
        });
      }

      return newPeriods;
    });

    triggerCelebration(`Moved "${expense.description}" to ${directionText} paycheck! 📦`);
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1];
      setPeriods(prevState);
      setUndoStack(prev => prev.slice(0, -1));
      triggerCelebration('Undone! 🔄');
    }
  };

  // ---------- CRUD helpers ----------
  const handleEditExpense = (expense) => setEditingExpense(expense);
  const handleDeleteExpense = (expenseId) =>
    setSourceExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, active: false } : exp));

  // ---------- Export CSV ----------
  const exportToCSV = () => {
    const headers = ['Period', 'Type', 'Date', 'Description', 'Category', 'Amount', 'Status', 'Amount Cleared'];
    const rows = [];
    periods.forEach(period => {
      [...(period.expenses || []), ...(period.oneOffExpenses || [])].forEach(expense => {
        rows.push([
          period.id + 1,
          period.type,
          formatDate(period.startDate),
          expense.description,
          expense.category,
          expense.amount,
          expense.status,
          expense.amountCleared || expense.amount
        ]);
      });
    });
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expense-planning.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const updateExpenseStatus = (periodId, expenseId, newStatus, amountCleared = null) => {
    setPeriods(prev => prev.map(period => {
      if (period.id !== periodId) return period;
      return {
        ...period,
        expenses: period.expenses.map(exp => {
          if (exp.id !== expenseId) return exp;
          return { ...exp, status: newStatus, amountCleared: amountCleared !== null ? amountCleared : exp.amountCleared };
        })
      };
    }));

    if (newStatus === 'cleared') {
      triggerCelebration('Expense cleared! ✅');
    } else if (newStatus === 'paid') {
      triggerCelebration('Payment recorded! 💳');
    }
  };

  // ---------- Analytics ----------
  const getAnalyticsData = () => {
    const categoryTotals = {};
    const monthlyTrends = {};
    periods.slice(0, 12).forEach((period, index) => {
      const monthKey = `Month ${Math.floor(index / 2) + 1}`;
      const totals = calculatePeriodTotals(period);

      if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { income: 0, expenses: 0, difference: 0 };
      monthlyTrends[monthKey].income += totals.totalIncome;
      monthlyTrends[monthKey].expenses += totals.totalExpenses;
      monthlyTrends[monthKey].difference += totals.difference;

      [...(period.expenses || []), ...(period.oneOffExpenses || [])].forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      });
    });
    return { categoryTotals, monthlyTrends };
  };

  // ---------- Handle expense modal save ----------
  const handleExpenseModalSave = (updatedExpense) => {
    setPeriods(prev => prev.map(period => {
      if (period.id !== expenseModal.periodId) return period;

      if (updatedExpense.isOneOff) {
        return {
          ...period,
          oneOffExpenses: period.oneOffExpenses.map(exp =>
            exp.id === updatedExpense.id ? { ...updatedExpense, updatedAt: new Date().toISOString() } : exp
          )
        };
      } else {
        return {
          ...period,
          expenses: period.expenses.map(exp =>
            exp.id === updatedExpense.id ? updatedExpense : exp
          )
        };
      }
    }));

    setExpenseModal({ open: false, expense: null, periodId: null });
    triggerCelebration('Expense updated! ✨');
  };

  // ---------- UI subcomponents ----------
  const IncomeSettings = () => {
    const [tempIncomeSettings, setTempIncomeSettings] = useState(incomeSettings);
    const formatDateForInput = (date) => (toDate(date) || new Date()).toISOString().split('T')[0];

    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Income & Schedule Settings</h3>
          <button onClick={() => { setTempIncomeSettings(incomeSettings); setShowIncomeSettings(false); }} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-800 mb-3">Paycheck Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Paycheck Date</label>
              <input
                type="date"
                value={formatDateForInput(tempIncomeSettings.startDate)}
                onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <div className="text-xs text-gray-600 mt-1">This sets when your paycheck cycle begins</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">First Paycheck Type</label>
              <select
                value={tempIncomeSettings.firstPaycheckType}
                onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, firstPaycheckType: e.target.value }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="A">Paycheck A</option>
                <option value="B">Paycheck B</option>
              </select>
              <div className="text-xs text-gray-600 mt-1">Whether your first paycheck is A or B type</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">A</span> Paycheck A Income
            </h4>
            <div>
              <label className="block text-sm font-medium mb-1">Amount per paycheck</label>
              <input
                type="number" step="0.01"
                value={tempIncomeSettings.paycheckA}
                onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, paycheckA: parseFloat(e.target.value) || 0 }))}
                className="w-full p-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <div className="text-xs text-gray-600 mt-1">Annual: {formatCurrency((tempIncomeSettings.paycheckA) * 26)}</div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">B</span> Paycheck B Income
            </h4>
            <div>
              <label className="block text-sm font-medium mb-1">Amount per paycheck</label>
              <input
                type="number" step="0.01"
                value={tempIncomeSettings.paycheckB}
                onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, paycheckB: parseFloat(e.target.value) || 0 }))}
                className="w-full p-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0.00"
              />
              <div className="text-xs text-gray-600 mt-1">Annual: {formatCurrency((tempIncomeSettings.paycheckB) * 26)}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-semibold mb-2">Income Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Monthly Income After Tax</div>
              <div className="font-bold text-lg">{formatCurrency((tempIncomeSettings.paycheckA + tempIncomeSettings.paycheckB))}</div>
              <div className="text-xs text-gray-500">(A + B)</div>
            </div>
            <div>
              <div className="text-gray-600">Annual Income After Tax</div>
              <div className="font-bold text-lg">{formatCurrency((tempIncomeSettings.paycheckA) * 26)}</div>
              <div className="text-xs text-gray-500">(1 Paycheck) × 26 paychecks per year</div>
            </div>
            <div>
              <div className="text-gray-600">Pay Frequency</div>
              <div className="font-bold text-lg">Bi-weekly</div>
              <div className="text-xs text-gray-500">26 paychecks per year</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setIncomeSettings(tempIncomeSettings); setShowIncomeSettings(false); triggerCelebration('Income settings saved! 💰'); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold">
            <Save className="w-4 h-4" /> Save Settings
          </button>
          <button onClick={() => { setTempIncomeSettings(incomeSettings); setShowIncomeSettings(false); }} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const SourceExpenseManagement = () => {
    const handleFormSave = (formData) => {
      if (editingExpense) {
        setSourceExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? { ...formData, id: editingExpense.id, active: true } : exp));
        triggerCelebration('Expense template updated! 📝');
      } else {
        const id = Math.max(...sourceExpenses.map(e => e.id), 0) + 1;
        setSourceExpenses(prev => [...prev, { ...formData, id, active: true }]);
        triggerCelebration('New expense template created! ➕');
      }
      setEditingExpense(null);
    };

    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Source of Truth Expenses</h3>
          <button onClick={() => setShowSourceManagement(false)} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ExpenseForm
          editingExpense={editingExpense}
          onSave={handleFormSave}
          onCancel={() => setEditingExpense(null)}
          categories={categories}
        />

        <div className="space-y-3">
          {sourceExpenses.filter(exp => exp.active).map(expense => (
            <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{expense.description}</div>
                  {expense.isOneOff && (
                    <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-700">One-off</span>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  {expense.category} • Due: {expense.dueDate} • Paycheck {expense.paycheckAssignment}
                  {expense.isDebt && ` • Balance: ${formatCurrency(expense.balance)} @ ${expense.apr}% APR`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                <button onClick={() => handleEditExpense(expense)} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteExpense(expense.id)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DebtPayoffTools = () => {
    const payoffData = calculateDebtPayoff();
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Calculator className="w-5 h-5" /> Debt Payoff Calculator</h3>
          <button onClick={() => setShowDebtTools(false)} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-red-600 text-sm">Total Debt</div>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(payoffData.totalDebt)}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-600 text-sm">Payoff Time</div>
            <div className="text-2xl font-bold text-blue-700">{Math.floor(payoffData.payoffMonths / 12)}y {payoffData.payoffMonths % 12}m</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-orange-600 text-sm">Total Interest</div>
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(payoffData.totalInterest)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Strategy & Extra Payment</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Payoff Strategy</label>
                <select value={debtStrategy} onChange={(e) => setDebtStrategy(e.target.value)} className="w-full p-2 border rounded">
                  <option value="avalanche">Debt Avalanche (Highest Interest First)</option>
                  <option value="snowball">Debt Snowball (Smallest Balance First)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Extra Monthly Payment</label>
                <input type="number" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} className="w-full p-2 border rounded" placeholder="0.00" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Payoff Order</h4>
            <div className="space-y-2">
              {payoffData.sortedDebts.map((debt, index) => (
                <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{index + 1}. {debt.description}</div>
                    <div className="text-xs text-gray-600">{debt.apr}% APR</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatCurrency(debt.balance)}</div>
                    <div className="text-xs text-gray-600">{formatCurrency(debt.minimumPayment)}/mo</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdvancedAnalytics = () => {
    const { categoryTotals, monthlyTrends } = getAnalyticsData();
    const totalCategoryAmount = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Financial Analytics</h3>
          <div className="flex gap-2">
            <button onClick={exportToCSV} className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setShowAnalytics(false)} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Category Distribution (Next 6 Months)</h4>
            <div className="space-y-2">
              {Object.entries(categoryTotals).map(([category, amount]) => {
                const percentage = totalCategoryAmount ? (amount / totalCategoryAmount) * 100 : 0;
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${Object.keys(categoryTotals).indexOf(category) * 45}, 70%, 60%)` }}></div>
                      <span className="text-sm">{category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(amount)}</div>
                      <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart className="w-4 h-4" /> Monthly Cash Flow Trends</h4>
            <div className="space-y-3">
              {Object.entries(monthlyTrends).map(([month, data]) => (
                <div key={month} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-sm mb-2">{month}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-green-600">Income</div><div className="font-semibold">{formatCurrency(data.income)}</div></div>
                    <div><div className="text-red-600">Expenses</div><div className="font-semibold">{formatCurrency(data.expenses)}</div></div>
                    <div>
                      <div className={`${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net</div>
                      <div className={`font-semibold ${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.difference)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-3">Financial Health Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded"><div className="text-blue-600 text-sm">Avg Monthly Savings</div>
              <div className="font-bold text-blue-700">
                {formatCurrency(Object.values(monthlyTrends).reduce((sum, m) => sum + m.difference, 0) / Math.max(1, Object.keys(monthlyTrends).length))}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded"><div className="text-purple-600 text-sm">Debt-to-Income Ratio</div>
              <div className="font-bold text-purple-700">{((calculateDebtPayoff().monthlyPayments / 2800) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-green-50 p-3 rounded"><div className="text-green-600 text-sm">Emergency Fund Goal</div>
              <div className="font-bold text-green-700">{formatCurrency(Object.values(categoryTotals).reduce((sum, val) => sum + val, 0) / 2)}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded"><div className="text-orange-600 text-sm">Largest Category</div>
              <div className="font-bold text-orange-700">
                {Object.entries(categoryTotals).reduce((max, [cat, amt]) => amt > max.amt ? { cat, amt } : max, { cat: '', amt: 0 }).cat}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PeriodHeader = ({ period }) => {
    const totals = calculatePeriodTotals(period);

    return (
      <div className="bg-white border rounded-lg p-1 mb-4 shadow-sm transition-all">
        {/* Date range */}
        <div className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-snug">
          {/* Mobile: stacked */}
          <div className="sm:hidden">
            <div>{formatDate(period.startDate)}</div>
            <div>{formatDate(period.endDate)}</div>
          </div>

          {/* Desktop: inline */}
          <div className="hidden sm:block">
            {formatDate(period.startDate)} — {formatDate(period.endDate)}
          </div>
        </div>
        {/* add one-off button */}
        <button
          onClick={() => setOneOffModal({ open: true, periodId: period.id, editingId: null, fields: { description: '', amount: 0, category: 'Other', status: 'pending', notes: '' } })}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Add One‑Off
        </button>

        {/* 2) Thin row for Paycheck chip + Net Income */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}
            title={`Paycheck ${period.type}`}
          >
            Paycheck {period.type}
          </span>

          <div className="text-right">
            <div className="text-[11px] text-gray-600 leading-none">Net Income</div>
            <div className={`font-bold text-lg sm:text-xl leading-tight ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {formatCurrency(totals.difference)}
            </div>
          </div>
        </div>

        {/* 3) Vertical metrics list */}
        <div className="mt-3 divide-y divide-gray-100">
          <div className="py-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Income</span>
            <span className="font-semibold text-green-600">{formatCurrency(totals.totalIncome)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Expenses</span>
            <span className="font-semibold">{formatCurrency(totals.totalExpenses)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">Paid</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totals.totalPaid)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">Unpaid</span>
            <span className={`font-semibold ${totals.unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totals.unpaidAmount)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Expense Edit Modal Component
  const ExpenseEditModal = () => {
    const [editedExpense, setEditedExpense] = useState(expenseModal.expense);
    const [showScopeSelection, setShowScopeSelection] = useState(false);
    const [editScope, setEditScope] = useState('instance'); // 'instance' or 'template'

    useEffect(() => {
      setEditedExpense(expenseModal.expense);
      setShowScopeSelection(false);
      setEditScope('instance');
    }, [expenseModal.expense]);

    if (!expenseModal.open || !editedExpense) return null;

    const handleSave = () => {
      // For one-off expenses, always save as instance
      if (editedExpense.isOneOff) {
        handleExpenseModalSave(editedExpense);
        return;
      }

      // For recurring expenses, show scope selection
      setShowScopeSelection(true);
    };

    const handleScopeConfirm = () => {
      if (editScope === 'template') {
        // Update the source expense template (affects future periods)
        setSourceExpenses(prev => prev.map(exp =>
          exp.id === editedExpense.id ? { ...editedExpense, active: true } : exp
        ));

        // Also update this specific instance
        handleExpenseModalSave(editedExpense);

        triggerCelebration('Expense template updated! All future instances will use the new values 🔄');
      } else {
        // Just update this instance
        handleExpenseModalSave(editedExpense);
      }

      setShowScopeSelection(false);
      setExpenseModal({ open: false, expense: null, periodId: null });
    };

    const handleDelete = () => {
      if (confirm(`Delete "${editedExpense.description}"?`)) {
        setPeriods(prev => prev.map(period => {
          if (period.id !== expenseModal.periodId) return period;

          if (editedExpense.isOneOff) {
            return {
              ...period,
              oneOffExpenses: period.oneOffExpenses.filter(e => e.id !== editedExpense.id)
            };
          } else {
            return {
              ...period,
              expenses: period.expenses.filter(e => e.id !== editedExpense.id)
            };
          }
        }));
        setExpenseModal({ open: false, expense: null, periodId: null });
        triggerCelebration('Expense deleted! 🗑️');
      }
    };

    // Scope selection modal
    if (showScopeSelection) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Apply Changes</h3>
                <p className="text-sm text-gray-600">How should these changes be applied?</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="editScope"
                  value="instance"
                  checked={editScope === 'instance'}
                  onChange={(e) => setEditScope(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Just this instance</div>
                  <div className="text-sm text-gray-600">
                    Only update this specific occurrence. Future instances will keep the original values.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="editScope"
                  value="template"
                  checked={editScope === 'template'}
                  onChange={(e) => setEditScope(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Adjust moving forward</div>
                  <div className="text-sm text-gray-600">
                    Update the template and all future instances. Past instances remain unchanged.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowScopeSelection(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleScopeConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Apply Changes
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Edit {editedExpense.isOneOff ? 'One-Off ' : ''}Expense
            </h3>
            <button
              onClick={() => setExpenseModal({ open: false, expense: null, periodId: null })}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={editedExpense.description || ''}
                onChange={(e) => setEditedExpense(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedExpense.amount || ''}
                  onChange={(e) => setEditedExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={editedExpense.category || ''}
                  onChange={(e) => setEditedExpense(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editedExpense.status || 'pending'}
                  onChange={(e) => setEditedExpense(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>

              {editedExpense.status === 'cleared' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Cleared</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedExpense.amountCleared || editedExpense.amount}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, amountCleared: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {editedExpense.isDebt && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedExpense.balance || ''}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedExpense.apr || ''}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, apr: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={editedExpense.notes || ''}
                onChange={(e) => setEditedExpense(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add any notes..."
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setExpenseModal({ open: false, expense: null, periodId: null })}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================== ExpenseItem (COMPLETELY UPDATED) =====================
  const ExpenseItem = ({ expense, periodId }) => {
    const currentPeriodIndex = periods.findIndex(p => p.id === periodId);
    const canMoveBack = currentPeriodIndex > 0 && expense.status === 'pending';
    const canMoveForward = currentPeriodIndex < periods.length - 1 && expense.status === 'pending';

    // Route status updates based on whether it's a one-off
    const setStatus = (newStatus) => {
      if (expense.isOneOff) {
        updateOneOff(periods, setPeriods, periodId, expense.id, { status: newStatus });
      } else {
        updateExpenseStatus(periodId, expense.id, newStatus);
      }
    };

    return (
      <div
        className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer select-none"
        onClick={() => setExpenseModal({ open: true, expense, periodId })}
      >
        {/* Top row: description + (optional) one-off tag | amount */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="font-medium">{expense.description}</div>
              {expense.isOneOff && (
                <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-700">One-off</span>
              )}
            </div>
            {expense.category && (
              <div className="text-sm text-gray-600">{expense.category}</div>
            )}
          </div>

          <div className="text-right pointer-events-none">
            <div className="font-semibold">{formatCurrency(expense.amount)}</div>
            {expense.isDebt && (
              <div className="text-xs text-purple-600">
                Balance: {formatCurrency(expense.balance)}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: actions */}
        <div className="flex items-center justify-between">
          {/* Status indicator */}
          <div className="text-xs text-gray-500">
            Status: <span className="font-medium capitalize">{expense.status || 'pending'}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Move buttons - only show for pending expenses */}
            {canMoveBack && (
              <button
                onClick={() => moveExpense(expense, periodId, 'backward')}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                title="Move to previous paycheck"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}

            {canMoveForward && (
              <button
                onClick={() => moveExpense(expense, periodId, 'forward')}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                title="Move to next paycheck"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => setStatus('paid')}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              disabled={expense.status === 'cleared'}
            >
              Paid
            </button>
            <button
              onClick={() => setStatus('cleared')}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Cleared
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ===================== /ExpenseItem =====================

  const DebtSummary = () => {
    const debtExpenses = sourceExpenses.filter(exp => exp.isDebt && exp.active);
    const totalDebt = debtExpenses.reduce((sum, exp) => sum + exp.balance, 0);
    const monthlyPayments = debtExpenses.reduce((sum, exp) => sum + exp.minimumPayment, 0);
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Debt Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div><div className="text-purple-600">Total Debt</div><div className="font-bold text-purple-800">{formatCurrency(totalDebt)}</div></div>
          <div><div className="text-purple-600">Monthly Payments</div><div className="font-bold text-purple-800">{formatCurrency(monthlyPayments)}</div></div>
        </div>
        <div className="space-y-2">
          {debtExpenses.map(debt => (
            <div key={debt.id} className="flex justify-between items-center text-sm">
              <span>{debt.description}</span>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(debt.balance)}</div>
                <div className="text-xs text-purple-600">{debt.apr}% APR</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowDebtTools(true)} className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
          <Calculator className="w-4 h-4" /> Payoff Calculator
        </button>
      </div>
    );
  };

  const Analytics = () => {
    const { categoryTotals } = getAnalyticsData();
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Quick Analytics</h3>
        <div className="space-y-3">
          {Object.entries(categoryTotals).slice(0, 5).map(([category, total]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-sm">{category}</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setShowAnalytics(true)} className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" /> Full Analytics
        </button>
      </div>
    );
  };

  const ViewControls = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button onClick={() => setCurrentView('single')} className={`px-3 py-2 rounded text-sm ${currentView === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Single Period</button>
      <button onClick={() => setCurrentView('side-by-side')} className={`px-3 py-2 rounded text-sm ${currentView === 'side-by-side' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Side-by-Side</button>
      <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-2 rounded text-sm ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Dashboard</button>
      {undoStack.length > 0 && (
        <button onClick={handleUndo} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Undo Move
        </button>
      )}
    </div>
  );

  // Celebration Component
  const CelebrationToast = () => {
    if (!celebration.show) return null;

    return (
      <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">{celebration.message}</span>
      </div>
    );
  };

  const renderSinglePeriod = () => {
    const period = periods[selectedPeriod];
    if (!period) return null;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - 1))} disabled={selectedPeriod === 0} className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-600">Period {selectedPeriod + 1} of {periods.length}</span>
          <button onClick={() => setSelectedPeriod(Math.min(periods.length - 1, selectedPeriod + 1))} disabled={selectedPeriod === periods.length - 1} className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50">Next</button>
        </div>
        <PeriodHeader period={period} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h4 className="font-semibold mb-3">Expenses (Click to edit • Use arrows to move between paychecks)</h4>
            <div className="space-y-3">
              {[...(period.expenses || []), ...(period.oneOffExpenses || [])].map(expense => (
                <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <DebtSummary />
            <Analytics />
          </div>
        </div>
      </div>
    );
  };

  const renderSideBySide = () => {
    const periodsToShow = periods.slice(selectedPeriod, selectedPeriod + SIDE_BY_SIDE_COUNT);

    return (
      <div className="space-y-4">
        {/* Responsive header */}
        <div className="sticky top-2 z-10 bg-gray-50/80 backdrop-blur rounded-md p-2" >
          <div className="grid grid-cols-2 sm:grid-cols-3 items-center gap-2">
            {/* Left button */}
            <div className="order-2 sm:order-1">
              <button
                onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - SIDE_BY_SIDE_COUNT))}
                disabled={selectedPeriod === 0}
                className="w-full sm:w-auto px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
              >
                Previous {SIDE_BY_SIDE_COUNT}
              </button>
            </div>

            {/* Center label */}
            <div className="col-span-2 sm:col-span-1 order-1 sm:order-2 text-center">
              <span className="text-sm sm:text-base text-gray-700 font-medium">
                Periods {selectedPeriod + 1}–{Math.min(selectedPeriod + SIDE_BY_SIDE_COUNT, periods.length)}
              </span>
            </div>

            {/* Right button */}
            <div className="order-3 text-right">
              <button
                onClick={() =>
                  setSelectedPeriod(
                    Math.min(Math.max(0, periods.length - SIDE_BY_SIDE_COUNT), selectedPeriod + SIDE_BY_SIDE_COUNT)
                  )
                }
                disabled={selectedPeriod >= periods.length - SIDE_BY_SIDE_COUNT}
                className="w-full sm:w-auto px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
              >
                Next {SIDE_BY_SIDE_COUNT}
              </button>
            </div>
          </div>
        </div >

        {/* 4 cycles side by side responsive style. Adjust # of columns at the very top */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {periodsToShow.map(period => (
              <div key={period.id} className="space-y-4">
                <PeriodHeader period={period} />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Expenses</h4>
                  {[...(period.expenses || []), ...(period.oneOffExpenses || [])].map(expense => (
                    <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keep your summary widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DebtSummary />
          <Analytics />
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const periodsToShow = periods.slice(0, 12);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DebtSummary />
          <Analytics />
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Next 3 Months</h3>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(periodsToShow.slice(0, 6).reduce((sum, p) => sum + calculatePeriodTotals(p).difference, 0))}
            </div>
            <div className="text-sm text-green-600">Net Income</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Unpaid This Month</h3>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(periodsToShow.slice(0, 2).reduce((sum, p) => sum + calculatePeriodTotals(p).unpaidAmount, 0))}
            </div>
            <div className="text-sm text-red-600">Needs Attention</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {periodsToShow.map(period => {
            const totals = calculatePeriodTotals(period);
            return (
              <div
                key={period.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setSelectedPeriod(period.id); setCurrentView('single'); }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded text-xs ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{period.type}</span>
                  <div className={`text-lg font-bold ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.difference)}</div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{formatDate(period.startDate)}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Income:</span><span className="text-green-600">{formatCurrency(totals.totalIncome)}</span></div>
                  <div className="flex justify-between"><span>Expenses:</span><span>{formatCurrency(totals.totalExpenses)}</span></div>
                  <div className="flex justify-between"><span>Unpaid:</span><span className={totals.unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(totals.unpaidAmount)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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

              {/* Right-side controls */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Data controls: prefer live file sync when supported; otherwise fall back to JSON import/export */}
                {fsSupported ? (
                  // Browser supports File System Access API (Chrome/Edge desktop).
                  // Hide Import/Export in this case, per your request.
                  <>
                    {!syncHandle && (
                      <>
                        <button
                          onClick={connectSyncFile}
                          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center gap-2"
                          title="Pick a JSON in a cloud-synced folder to auto-save into"
                        >
                          <Upload className="w-4 h-4" />
                          Connect Sync File
                        </button>
                        <button
                          onClick={loadFromSyncFile}
                          className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded text-sm"
                          title="Load existing JSON and enable autosave"
                        >
                          Load From Sync File
                        </button>
                      </>
                    )}
                    {/* When a sync file is connected, we keep these hidden.
        Autosave status is shown on the line below the header. */}
                  </>
                ) : (
                  // Browser does NOT support File System Access API (Safari/iOS, most mobile).
                  // Show Import/Export JSON as the fallback.
                  <div className="flex gap-2">
                    <button
                      onClick={exportAppStateJSON}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm"
                      title="Download current state as JSON"
                    >
                      Export State JSON
                    </button>

                    <label
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm cursor-pointer"
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

                {/* Existing features */}
                <button onClick={() => setShowSourceManagement(true)} className="px-3 py-2 bg-gray-600 text-white rounded text-sm flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Manage Expenses
                </button>
                <button onClick={() => setShowIncomeSettings(true)} className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Income Settings
                </button>
                <button onClick={() => setShowDebtTools(!showDebtTools)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${showDebtTools ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  <Target className="w-4 h-4" /> Debt Tools
                </button>
                <button onClick={() => setShowAnalytics(!showAnalytics)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${showAnalytics ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  <BarChart3 className="w-4 h-4" /> Analytics
                </button>
                <button onClick={exportToCSV} className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button
                  onClick={() => {
                    if (confirm('This will clear all your data and start fresh. Are you sure?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center gap-2"
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
        {showSourceManagement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"><SourceExpenseManagement /></div>
          </div>
        )}

        {showIncomeSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"><IncomeSettings /></div>
          </div>
        )}

        {showDebtTools && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"><DebtPayoffTools /></div>
          </div>
        )}

        {showAnalytics && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"><AdvancedAnalytics /></div>
          </div>
        )}

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
                    addOneOff(periods, setPeriods, oneOffModal.periodId, oneOffModal.fields);
                    setOneOffModal({ open: false, periodId: null, editingId: null, fields: null });
                    triggerCelebration('One-off expense added! 📋');
                  }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <ExpenseEditModal />

        <ViewControls />

        {currentView === 'single' && renderSinglePeriod()}
        {currentView === 'side-by-side' && renderSideBySide()}
        {currentView === 'dashboard' && renderDashboard()}
      </div>
    </div>
  );
};

export default ExpenseTrackingApp;