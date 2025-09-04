import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, DollarSign, CreditCard, TrendingUp, Settings, Plus, Minus, BarChart3, Target,
  ArrowUpDown, Check, Clock, AlertTriangle, ChevronDown, ChevronUp, Edit, Trash2, Save, X,
  Download, Upload, Zap, Calculator, PieChart, LineChart, Menu, RotateCcw, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ExpenseForm from './ExpenseForm';
import PaycheckCalculator from './PaycheckCalculator';

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
      // Check if we're approaching localStorage limit
      const serialized = JSON.stringify(value);
      if (serialized.length > 5 * 1024 * 1024) { // 5MB warning
        console.warn(`Large localStorage save for ${key}: ${(serialized.length / 1024 / 1024).toFixed(2)}MB`);
      }
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      if (error.name === 'QuotaExceededError') {
        // Try to free up space by clearing old undo stack
        if (key !== 'expenseTracker_undoStack') {
          localStorage.removeItem('expenseTracker_undoStack');
          try {
            localStorage.setItem(key, JSON.stringify(value));
            setUndoStack([]); // Clear undo stack from memory too
          } catch {
            alert('Storage quota exceeded. Please export your data and refresh the page.');
          }
        }
      }
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
  const [undoStack, setUndoStack] = useState(() => loadFromStorage('expenseTracker_undoStack', []));
  const [oneOffModal, setOneOffModal] = useState({ open: false, periodId: null, editingId: null, fields: null });
  const [showPaycheckCalculator, setShowPaycheckCalculator] = useState(false);
  const [expenseSort, setExpenseSort] = useState({ key: 'default', direction: 'asc' });


  // --- Onboarding (first-time only) ---
  const [showOnboarding, setShowOnboarding] = useState(() =>
    !loadFromStorage('expenseTracker_seenOnboarding', false)
  );
  const closeOnboarding = () => {
    setShowOnboarding(false);
    saveToStorage('expenseTracker_seenOnboarding', true);
  };


  // New state for expense editing modal
  const [expenseModal, setExpenseModal] = useState({ open: false, expense: null, periodId: null });
  const [partialPaymentModal, setPartialPaymentModal] = useState({ open: false, expense: null, periodId: null });

  // Mobile sync modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [syncHandle, setSyncHandle] = useState(null);
  const [lastSaveError, setLastSaveError] = useState(() => loadFromStorage('expenseTracker_lastSaveError', ''));
  const [lastSavedAt, setLastSavedAt] = useState(() => {
    const saved = loadFromStorage('expenseTracker_lastSavedAt', null);
    return saved ? toDate(saved) : null;
  });

  // Persist sync state
  useEffect(() => { saveToStorage('expenseTracker_lastSaveError', lastSaveError); }, [lastSaveError]);
  useEffect(() => { saveToStorage('expenseTracker_lastSavedAt', lastSavedAt); }, [lastSavedAt]);

  async function writeSyncFile(handle, obj) {
    console.log('📝 Writing to sync file...', {
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(obj).length,
      fileName: handle.name
    });

    const writable = await handle.createWritable();
    await writable.write(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    await writable.close();

    console.log('📁 Sync file write completed', {
      timestamp: new Date().toISOString(),
      fileName: handle.name
    });
  }

  async function readSyncFile(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async function connectSyncFile() {
    try {
      console.log('🔗 Connecting to sync file...');
      const handle = await window.showSaveFilePicker({
        suggestedName: 'expense-planner.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      console.log('📂 Sync file selected:', handle.name);

      setSyncHandle(handle);
      await writeSyncFile(handle, packAppState());
      setLastSavedAt(new Date());
      setLastSaveError('');
      triggerCelebration('Sync file connected! Your data will auto-save ✨');

      console.log('✅ Sync file connection completed successfully');
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
    // Debounce saves to avoid excessive writes during rapid updates
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);

    console.log('🔄 State changed, scheduling autosave...', {
      syncHandle: !!syncHandle,
      timestamp: new Date().toISOString()
    });

    saveDebounceRef.current = setTimeout(async () => {
      try {
        console.log('💾 Starting autosave to sync file...', {
          timestamp: new Date().toISOString(),
          dataSize: JSON.stringify(packAppState()).length
        });

        await writeSyncFile(syncHandle, packAppState());
        const savedAt = new Date();
        setLastSavedAt(savedAt);
        setLastSaveError('');

        console.log('✅ Autosave completed successfully!', {
          timestamp: savedAt.toISOString(),
          lastSavedAt: savedAt
        });
      } catch (e) {
        console.error('❌ Autosave failed:', e);
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
  useEffect(() => { saveToStorage('expenseTracker_undoStack', undoStack); }, [undoStack]);

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

        // Check if existing period has expenses with modifications
        const existingPeriod = prevPeriods.find(p => p.id === i);
        const existingOneOffs = existingPeriod?.oneOffExpenses || [];

        // Start with existing expenses if they exist, otherwise generate from template
        let periodExpenses = [];

        if (existingPeriod && existingPeriod.expenses && existingPeriod.expenses.length > 0) {
          // Keep existing expenses (they may have been moved or modified)
          periodExpenses = existingPeriod.expenses.map(exp => {
            // Update template-based properties but keep instance modifications
            const templateExp = sourceExpenses.find(se => se.id === exp.id && se.active);
            if (templateExp) {
              // Only update if this expense hasn't been individually modified
              const isIndividuallyModified = exp.amount !== templateExp.amount ||
                exp.description !== templateExp.description ||
                exp.category !== templateExp.category ||
                exp.status !== 'pending' ||
                exp.notes ||
                exp.periodId !== i; // This indicates it was moved

              if (!isIndividuallyModified) {
                // Sync with template
                return {
                  ...templateExp,
                  periodId: i,
                  status: exp.status || 'pending',
                  amountCleared: exp.amountCleared || templateExp.amount,
                  position: exp.position ?? 0
                };
              }
            }
            return exp; // Keep existing expense as-is (moved or modified)
          });

          // Add any new expenses from template that don't exist in this period
          const templateExpenses = sourceExpenses.filter(exp =>
            exp.active &&
            exp.paycheckAssignment === (isAPaycheck ? 'A' : 'B') &&
            !periodExpenses.some(pe => pe.id === exp.id) &&
            !(existingPeriod?.excludedExpenseIds || []).includes(exp.id)
          );

          templateExpenses.forEach(exp => {
            periodExpenses.push({
              ...exp,
              periodId: i,
              status: 'pending',
              amountCleared: exp.amount,
              position: (periodExpenses.reduce((m, e) => Math.max(m, (e.position ?? -1)), -1) + 1)
            });
          });
        } else {
          // No existing period, generate from template
          periodExpenses = sourceExpenses
            .filter(exp => exp.active && exp.paycheckAssignment === (isAPaycheck ? 'A' : 'B'))
            .map((exp) => ({
              ...exp,
              periodId: i,
              status: 'pending',
              amountCleared: exp.amount,
              position: (periodExpenses.reduce((m, e) => Math.max(m, (e.position ?? -1)), -1) + 1)
            }));
        }

        generatedPeriods.push({
          id: i,
          type: isAPaycheck ? 'A' : 'B',
          startDate: new Date(periodDate),
          endDate: new Date(periodDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          defaultIncome: isAPaycheck ? incomeSettings.paycheckA : incomeSettings.paycheckB,
          additionalIncome: existingPeriod?.additionalIncome || 0,
          expenses: periodExpenses,
          status: 'active',
          // ✅ Preserve existing one-off expenses
          oneOffExpenses: existingOneOffs,
          excludedExpenseIds: existingPeriod?.excludedExpenseIds || []
        });
      }
      return generatedPeriods;
    });
  }, [sourceExpenses, incomeSettings]);

  useEffect(() => {
    // Ensure one-off arrays exist before generating periods
    ensureOneOffArray(periods);
    generatePeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const allExpenses = [...baseExpenses, ...oneOffs];

    // Expenses should be calculated based on the original amount, not the remaining amount
    const totalExpenses = allExpenses.reduce((sum, exp) => sum + (exp.originalAmount || exp.amount), 0);

    // Paid totals need to account for partial payments
    const totalPaid = allExpenses.reduce((sum, exp) => {
      // If it was cleared, the full original amount is considered paid.
      if (exp.status === 'cleared') {
        return sum + (exp.originalAmount || exp.amount);
      }
      // If it was marked as 'paid' (e.g. fully paid via partials, or manually),
      // use the paidAmount if available, otherwise the full amount.
      if (exp.status === 'paid') {
        return sum + (exp.paidAmount || exp.originalAmount || exp.amount);
      }
      // For pending items, just add any partial payments.
      return sum + (exp.paidAmount || 0);
    }, 0);


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

  // ---------- Expense Sorting ----------
  const getSortableValue = (expense, period, key) => {
    if (key === 'date') {
      if (expense.isOneOff) {
        return toDate(expense.createdAt)?.getTime() || 0;
      }
      if (period && expense.dueDate) {
        const periodStart = toDate(period.startDate);
        const expenseDay = expense.dueDate;
        let dueMonth = periodStart.getMonth();
        let dueYear = periodStart.getFullYear();
        if (expenseDay < periodStart.getDate()) {
          dueMonth += 1;
          if (dueMonth > 11) {
            dueMonth = 0;
            dueYear += 1;
          }
        }
        return new Date(dueYear, dueMonth, expenseDay).getTime();
      }
      return 0;
    }
    return expense.position ?? 0;
  };

  const sortExpenses = (expenses, period, sortConfig) => {
    const { key, direction } = sortConfig;
    if (key === 'default') {
      return expenses;
    }

    return [...expenses].sort((a, b) => {
      const valA = getSortableValue(a, period, key);
      const valB = getSortableValue(b, period, key);

      if (valA < valB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };



  // ---------- Move expense between periods ----------
  const moveExpense = (expense, fromPeriodId, direction) => {
    const fromPeriodIndex = periods.findIndex(p => p.id === fromPeriodId);
    const toPeriodIndex = direction === 'forward' ? fromPeriodIndex + 1 : fromPeriodIndex - 1;
    if (toPeriodIndex < 0 || toPeriodIndex >= periods.length) return;

    const toPeriodId = periods[toPeriodIndex].id;
    const directionText = direction === 'forward' ? 'next' : 'previous';

    setUndoStack(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(periods))]);

    setPeriods(prev => {
      const newPeriods = structuredClone(prev);
      const fromPeriod = newPeriods.find(p => p.id === fromPeriodId);
      const toPeriod = newPeriods.find(p => p.id === toPeriodId);

      if (expense.isOneOff) {
        // Move one-off expense
        fromPeriod.oneOffExpenses = (fromPeriod.oneOffExpenses || []).filter(e => e.id !== expense.id);
        const oneOffMaxPos = (toPeriod.oneOffExpenses || []).reduce((m, e) => Math.max(m, (e.position ?? -1)), -1);
        toPeriod.oneOffExpenses = toPeriod.oneOffExpenses || [];
        toPeriod.oneOffExpenses.push({
          ...expense,
          periodId: toPeriodId,
          status: 'pending',
          updatedAt: new Date().toISOString(),
          position: oneOffMaxPos + 1
        });
      } else {
        // Move regular expense (template-based) — only this instance
        fromPeriod.expenses = (fromPeriod.expenses || []).filter(e => e.id !== expense.id);

        // Mark this period as excluded for this template expense id so it won't be re-injected
        fromPeriod.excludedExpenseIds = Array.isArray(fromPeriod.excludedExpenseIds) ? fromPeriod.excludedExpenseIds : [];
        if (!fromPeriod.excludedExpenseIds.includes(expense.id)) {
          fromPeriod.excludedExpenseIds.push(expense.id);
        }

        // Ensure destination period allows this id
        toPeriod.excludedExpenseIds = Array.isArray(toPeriod.excludedExpenseIds) ? toPeriod.excludedExpenseIds : [];
        toPeriod.excludedExpenseIds = toPeriod.excludedExpenseIds.filter(id => id !== expense.id);

        // Append to destination with stable position
        const maxPos = (toPeriod.expenses || []).reduce((m, e) => Math.max(m, (e.position ?? -1)), -1);
        toPeriod.expenses = toPeriod.expenses || [];
        toPeriod.expenses.push({
          ...expense,
          periodId: toPeriodId,
          status: 'pending',
          amountCleared: expense.amount,
          updatedAt: new Date().toISOString(),
          position: maxPos + 1
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

  // Limit undo stack size to prevent localStorage bloat
  useEffect(() => {
    if (undoStack.length > 10) {
      setUndoStack(prev => prev.slice(-10));
    }
  }, [undoStack]);

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
    const originalExpense = expenseModal.expense;
    let finalExpense = { ...updatedExpense, updatedAt: new Date().toISOString() };

    // The modal's "amount" field represents the total amount.
    // Compare it to the original total to see if it changed.
    const originalTotalAmount = originalExpense.originalAmount || originalExpense.amount;

    if (finalExpense.amount !== originalTotalAmount) {
      // If the total amount was changed, we must reset this instance's partial
      // payment history to prevent data inconsistency (e.g., paid > new total).
      finalExpense.paidAmount = 0;
      finalExpense.originalAmount = null; // The `amount` field is now the source of truth.
      // If status was paid/cleared, it's now pending since the total is different.
      if (finalExpense.status === 'paid' || finalExpense.status === 'cleared') {
        finalExpense.status = 'pending';
      }
    } else {
      // If the total amount is unchanged, we must restore the original partial
      // payment data, because the modal editor flattened it for the UI.
      finalExpense.amount = originalExpense.amount;
      finalExpense.originalAmount = originalExpense.originalAmount;
      finalExpense.paidAmount = originalExpense.paidAmount;
    }

    setPeriods(prev => prev.map(period => {
      if (period.id !== expenseModal.periodId) return period;

      if (finalExpense.isOneOff) {
        return {
          ...period,
          oneOffExpenses: (period.oneOffExpenses || []).map(exp =>
            exp.id === finalExpense.id ? finalExpense : exp
          )
        };
      } else {
        return {
          ...period,
          expenses: (period.expenses || []).map(exp =>
            exp.id === finalExpense.id ? finalExpense : exp
          )
        };
      }
    }));

    setExpenseModal({ open: false, expense: null, periodId: null });
    triggerCelebration('Expense updated! ✨');
  };

  const ExpenseSortControl = ({ sortConfig, onSortChange }) => {
    const handleSort = (key) => {
      if (sortConfig.key === key) {
        onSortChange({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        onSortChange({ key, direction: 'asc' });
      }
    };

    return (
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => handleSort('date')}
          className={`px-2 py-1 rounded flex items-center gap-1 ${sortConfig.key === 'date' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
        >
          Sort by Date
          {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
        </button>
      </div>
    );
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

  const SyncModal = () => {
    if (!showSyncModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSyncModal(false)}>
        <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Sync Data</h3>
            <button onClick={() => setShowSyncModal(false)} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            To sync across devices, first <strong>Download</strong> your data file. Save it to a shared cloud folder (like iCloud or Google Drive). Then, on your other device, <strong>Upload</strong> it from that folder.
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                exportAppStateJSON();
                setShowSyncModal(false);
                triggerCelebration('Data downloaded!');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              <Download className="w-5 h-5" /> Download Data
            </button>
            <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold cursor-pointer hover:bg-gray-200">
              <Upload className="w-5 h-5" /> Upload Data
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    importAppStateJSON(e.target.files[0]);
                  }
                  setShowSyncModal(false);
                }}
              />
            </label>
          </div>
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
    const [localExtraPayment, setLocalExtraPayment] = useState(String(extraPayment));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setLocalExtraPayment(String(extraPayment));
    }, [extraPayment]);

    const handleBlur = () => {
        const value = parseFloat(localExtraPayment);
        if (!isNaN(value)) {
            setExtraPayment(value);
        } else {
            setExtraPayment(0);
        }
    };

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
                <input
                    type="number"
                    value={localExtraPayment}
                    onChange={(e) => setLocalExtraPayment(e.target.value)}
                    onBlur={handleBlur}
                    className="w-full p-2 border rounded"
                    placeholder="0.00"
                />
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
    const categoryChartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    const COLORS = Object.keys(categoryTotals).map((_, index) => `hsl(${index * 45}, 70%, 60%)`);
    const trendsChartData = Object.entries(monthlyTrends).map(([name, data]) => ({
      name,
      Income: data.income,
      Expenses: data.expenses,
    }));

    const formatAxisTick = (tick) => {
      if (tick >= 1000) {
        return `$${tick / 1000}k`;
      }
      return `$${tick}`;
    };

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Category Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart className="w-4 h-4" /> Monthly Cash Flow</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatAxisTick} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Income" fill="#82ca9d" />
                <Bar dataKey="Expenses" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
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
    const [editedExpense, setEditedExpense] = useState(null); // Initialized empty
    const [showScopeSelection, setShowScopeSelection] = useState(false);
    const [editScope, setEditScope] = useState('instance'); // 'instance' or 'template'

    const { expense } = expenseModal;
    useEffect(() => {
      if (expense) {
        // When the modal opens, we want the "Amount" field to represent the
        // expense's total value, not the remaining amount after partial payments.
        // We create a temporary, flattened object for editing.
        setEditedExpense({
          ...expense,
          amount: expense.originalAmount || expense.amount,
        });
      } else {
        setEditedExpense(null);
      }
      setShowScopeSelection(false);
      setEditScope('instance');
    }, [expense]);

    if (!expenseModal.open || !editedExpense) return null;

    const onClose = () => setExpenseModal({ open: false, expense: null, periodId: null });

    const handleSaveClick = () => {
      if (editedExpense.isOneOff) {
        handleExpenseModalSave(editedExpense);
        return;
      }
      setShowScopeSelection(true);
    };

    const handleScopeConfirm = () => {
      if (editScope === 'template') {
        // Update template & propagate to current and future periods
        setSourceExpenses(prev => prev.map(exp =>
          exp.id === editedExpense.id ? { ...editedExpense, active: true } : exp
        ));

        const currentPeriodIndex = periods.findIndex(p => p.id === expenseModal.periodId);

        setPeriods(prev => prev.map((period, index) => {
          if (index < currentPeriodIndex) return period;
          return {
            ...period,
            expenses: (period.expenses || []).map(exp =>
              exp.id === editedExpense.id ? {
                ...exp,
                ...editedExpense,
                periodId: period.id,
                status: index === currentPeriodIndex ? editedExpense.status : 'pending'
              } : exp
            )
          };
        }));

        triggerCelebration('Expense updated for this and all future paychecks! 🔄');
      } else {
        handleExpenseModalSave(editedExpense);
      }

      setShowScopeSelection(false);
      onClose();
    };

    const handleDelete = () => {
      setUndoStack(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(periods))]);
      setPeriods(prev => prev.map(period => {
        if (period.id !== expenseModal.periodId) return period;
        if (editedExpense.isOneOff) {
          return { ...period, oneOffExpenses: (period.oneOffExpenses || []).filter(e => e.id !== editedExpense.id) };
        } else {
          const updated = { ...period, expenses: (period.expenses || []).filter(e => e.id !== editedExpense.id) };
          updated.excludedExpenseIds = Array.isArray(updated.excludedExpenseIds) ? updated.excludedExpenseIds : [];
          if (!updated.excludedExpenseIds.includes(editedExpense.id)) updated.excludedExpenseIds.push(editedExpense.id);
          return updated;
        }
      }));
      triggerCelebration(`Deleted "${editedExpense.description}". You can Undo.`);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg p-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">
              {editedExpense.isOneOff ? 'Edit One-Off Expense' : 'Edit Expense'}
            </h3>
            <button className="p-2 rounded hover:bg-gray-100" onClick={onClose}><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Description"
              value={editedExpense.description || ''}
              onChange={e => setEditedExpense(prev => ({ ...prev, description: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              placeholder="Amount"
              value={editedExpense.amount ?? 0}
              onChange={e => setEditedExpense(prev => ({ ...prev, amount: parseFloat(e.target.value || 0) }))}
            />
            {!editedExpense.isOneOff && (
              <select
                className="w-full border rounded px-2 py-1"
                value={editedExpense.status || 'pending'}
                onChange={e => setEditedExpense(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cleared">Cleared</option>
              </select>
            )}
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={handleDelete} className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveClick} className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
            </div>
          </div>

          {showScopeSelection && !editedExpense.isOneOff && (
            <div className="mt-4 p-3 border rounded">
              <div className="font-medium mb-2">Apply changes to:</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="scope" value="instance" checked={editScope === 'instance'} onChange={() => setEditScope('instance')} />
                  Only this paycheck (instance)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="scope" value="template" checked={editScope === 'template'} onChange={() => setEditScope('template')} />
                  This and future paychecks (update template)
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setShowScopeSelection(false)} className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">Back</button>
                <button onClick={handleScopeConfirm} className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Confirm</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PartialPaymentModal = () => {
    const { open, expense, periodId } = partialPaymentModal;
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (open) {
            setAmount(''); // Reset amount on open
        }
    }, [open]);

    if (!open || !expense) return null;

    const remainingAmount = expense.originalAmount ? expense.originalAmount - (expense.paidAmount || 0) : expense.amount;

    const handleSave = () => {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > remainingAmount) {
        alert('Please enter a valid amount that does not exceed the remaining balance.');
        return;
      }

      // Add to undo stack before making the change
      setUndoStack(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(periods))]);

      setPeriods(prevPeriods => {
        const newPeriods = structuredClone(prevPeriods);
        const period = newPeriods.find(p => p.id === periodId);

        const update = (exp) => {
            if (exp.id === expense.id) {
                const originalAmount = exp.originalAmount || exp.amount;
                const paidAmount = (exp.paidAmount || 0) + paymentAmount;
                const newAmount = originalAmount - paidAmount;

                return {
                    ...exp,
                    originalAmount: originalAmount,
                    paidAmount: paidAmount,
                    amount: newAmount,
                    status: newAmount <= 0.001 ? 'paid' : 'pending' // Use a small epsilon for float comparison
                };
            }
            return exp;
        };

        if (expense.isOneOff) {
            if (!period.oneOffExpenses) period.oneOffExpenses = [];
            period.oneOffExpenses = period.oneOffExpenses.map(update);
        } else {
            if (!period.expenses) period.expenses = [];
            period.expenses = period.expenses.map(update);
        }

        return newPeriods;
      });

      triggerCelebration('Partial payment recorded! 💰');
      handleClose();
    };

    const handleClose = () => {
      setPartialPaymentModal({ open: false, expense: null, periodId: null });
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
        <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">Make a Partial Payment</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600">{expense.description}</p>
            <p className="text-2xl font-bold">{formatCurrency(remainingAmount)}</p>
            <p className="text-sm text-gray-500">Remaining</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Payment Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Payment</button>
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

    // Date calculation
    const period = periods.find(p => p.id === periodId);
    let dueDateStr = '';
    if (period && expense.dueDate) {
      const periodStart = toDate(period.startDate);
      const expenseDay = expense.dueDate;

      let dueMonth = periodStart.getMonth();
      let dueYear = periodStart.getFullYear();

      if (expenseDay < periodStart.getDate()) {
        dueMonth += 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear += 1;
        }
      }
      const dueDate = new Date(dueYear, dueMonth, expenseDay);
      dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }


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
            {dueDateStr && (
              <div className="text-xs text-gray-500 pt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Due {dueDateStr}
              </div>
            )}
          </div>

          <div className="text-right pointer-events-none">
            <div className="font-semibold">{formatCurrency(expense.amount)}</div>
            {expense.originalAmount && (
                <div className="text-xs text-gray-500">
                    of {formatCurrency(expense.originalAmount)}
                </div>
            )}
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
              onClick={() => setPartialPaymentModal({ open: true, expense, periodId })}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              disabled={expense.status === 'cleared' || expense.status === 'paid'}
            >
              Pay
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
    <div className="space-y-3 mb-4">
      {/* Today's Date */}
      <div className="flex justify-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="text-sm text-blue-600 font-medium text-center">
            Today: {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => setCurrentView('single')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Single Period
        </button>
        <button onClick={() => setCurrentView('side-by-side')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'side-by-side' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Side-by-Side
        </button>
        <button onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Dashboard
        </button>
        {undoStack.length > 0 && (
          <button onClick={handleUndo} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 flex items-center gap-2 font-medium transition-colors">
            <RotateCcw className="w-4 h-4" /> Undo Move
          </button>
        )}
      </div>
    </div>
  );


  // -------- Onboarding Modal --------
  const OnboardingModal = ({ onClose }) => {
    const [step, setStep] = useState(0);
    const steps = [
      {
        title: 'Plan by Paycheck',
        icon: DollarSign,
        body: 'Your expenses are organized into A/B paychecks every two weeks. Net shows income minus expenses for that paycheck.'
      },
      {
        title: 'Move Single Instances',
        icon: ChevronRight,
        body: 'Use arrow buttons on a card to move just that instance to next/previous paycheck. Template remains unchanged.'
      },
      {
        title: 'Instant Actions + Undo',
        icon: RotateCcw,
        body: 'No confirmation dialogs. Mark as Paid/Cleared instantly; use Undo if needed.'
      },
      {
        title: 'One-Offs & Sync',
        icon: Upload,
        body: 'Add one-off items per paycheck. Optionally connect a sync file for automatic saves.'
      }
    ];
    const StepIcon = steps[step].icon;

    return (
      <div
        className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
      >
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <StepIcon className="w-5 h-5 text-blue-600" />
              <h3 id="onboard-title" className="text-lg font-semibold">
                {steps[step].title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Close onboarding"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-sm text-gray-700 mb-4">{steps[step].body}</p>

          {/* Tips */}
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            {step === 0 && (
              <>
                <li>• A/B chip shows which paycheck you’re on.</li>
                <li>• Net Income updates as you add/move items.</li>
              </>
            )}
            {step === 1 && (
              <>
                <li>• Moves persist across refreshes.</li>
                <li>• Template stays intact; only this instance changes.</li>
              </>
            )}
            {step === 2 && (
              <>
                <li>• Actions are instant; use the Undo button in the header.</li>
                <li>• Look for the green toast confirming the change.</li>
              </>
            )}
            {step === 3 && (
              <>
                <li>• Add one-offs from each period’s header.</li>
                <li>• Connect a sync file (when supported) for auto-save.</li>
              </>
            )}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Back
              </button>
              {step < steps.length - 1 ? (
                <button
                  onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                  className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Get started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
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
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Expenses</h4>
              <ExpenseSortControl sortConfig={expenseSort} onSortChange={setExpenseSort} />
            </div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Expenses</h4>
              <ExpenseSortControl sortConfig={expenseSort} onSortChange={setExpenseSort} />
            </div>
            <div className="space-y-3">
              {sortExpenses([...(period.expenses || []), ...(period.oneOffExpenses || [])], period, expenseSort).map(expense => (
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
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">Expenses</h4>
                    <ExpenseSortControl sortConfig={expenseSort} onSortChange={setExpenseSort} />
                  </div>
                  {sortExpenses([...(period.expenses || []), ...(period.oneOffExpenses || [])], period, expenseSort).map(expense => (
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
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-blue-600" />
              <span>Expense Planner</span>
            </h1>
            <div className="hidden md:flex items-center gap-4">
              <nav className="flex items-center gap-2">
                <button onClick={() => setShowIncomeSettings(true)} className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Income
                </button>
                <button onClick={() => setShowSourceManagement(true)} className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Expenses
                </button>
                <button onClick={() => setShowAnalytics(!showAnalytics)} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <BarChart3 className="w-4 h-4" /> Analytics
                </button>
                <button onClick={() => setShowDebtTools(!showDebtTools)} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showDebtTools ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <Target className="w-4 h-4" /> Debt Tools
                </button>
                <button onClick={() => setShowPaycheckCalculator(true)} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showPaycheckCalculator ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <Calculator className="w-4 h-4" /> Calculator
                </button>
              </nav>
              <div className="flex items-center gap-2 border-l pl-4">
                {fsSupported ? (
                  <>
                    {!syncHandle ? (
                      <>
                        <button onClick={connectSyncFile} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center gap-2 hover:bg-indigo-700" title="Pick a JSON in a cloud-synced folder to auto-save into">
                          <Upload className="w-4 h-4" /> Connect Sync
                        </button>
                        <button onClick={loadFromSyncFile} className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded text-sm hover:bg-indigo-200" title="Load existing JSON and enable autosave">
                          Load
                        </button>
                      </>
                    ) : (
                       <div className="text-xs text-gray-600 flex items-center gap-3">
                         <span>Autosaving...</span>
                         {lastSavedAt && <span className="text-green-700">Saved: {formatDate(lastSavedAt)}</span>}
                         {lastSaveError && <span className="text-red-600">Error: {lastSaveError}</span>}
                       </div>
                    )}
                  </>
                ) : (
                  <button onClick={() => setShowSyncModal(true)} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center gap-2 hover:bg-indigo-700">
                    <Upload className="w-4 h-4" /> Sync
                  </button>
                )}
                 <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-full"
                  title="Reset All Data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden pt-2 pb-4 border-t">
              <nav className="flex flex-col gap-2 mb-4">
                <button onClick={() => { setShowIncomeSettings(true); setIsMobileMenuOpen(false); }} className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Income
                </button>
                <button onClick={() => { setShowSourceManagement(true); setIsMobileMenuOpen(false); }} className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Expenses
                </button>
                <button onClick={() => { setShowAnalytics(!showAnalytics); setIsMobileMenuOpen(false); }} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <BarChart3 className="w-4 h-4" /> Analytics
                </button>
                <button onClick={() => { setShowDebtTools(!showDebtTools); setIsMobileMenuOpen(false); }} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showDebtTools ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <Target className="w-4 h-4" /> Debt Tools
                </button>
                <button onClick={() => { setShowPaycheckCalculator(true); setIsMobileMenuOpen(false); }} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${showPaycheckCalculator ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <Calculator className="w-4 h-4" /> Calculator
                </button>
              </nav>
              <div className="flex flex-col items-center gap-2 border-t pt-4">
                {fsSupported ? (
                  <>
                    {!syncHandle ? (
                      <>
                        <button onClick={connectSyncFile} className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center justify-center gap-2 hover:bg-indigo-700" title="Pick a JSON in a cloud-synced folder to auto-save into">
                          <Upload className="w-4 h-4" /> Connect Sync
                        </button>
                        <button onClick={loadFromSyncFile} className="w-full px-3 py-2 bg-indigo-100 text-indigo-800 rounded text-sm hover:bg-indigo-200" title="Load existing JSON and enable autosave">
                          Load
                        </button>
                      </>
                    ) : (
                       <div className="text-xs text-gray-600 flex items-center gap-3">
                         <span>Autosaving...</span>
                         {lastSavedAt && <span className="text-green-700">Saved: {formatDate(lastSavedAt)}</span>}
                         {lastSaveError && <span className="text-red-600">Error: {lastSaveError}</span>}
                       </div>
                    )}
                  </>
                ) : (
                  <button onClick={() => setShowSyncModal(true)} className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center justify-center gap-2 hover:bg-indigo-700">
                    <Upload className="w-4 h-4" /> Sync
                  </button>
                )}
                 <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-md flex items-center justify-center gap-2"
                  title="Reset All Data"
                >
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </button>
              </div>
            </div>
          )}
           {/* Autosave status line - moved inside for better layout control */}
            {syncHandle && (
              <div className="pb-2 text-xs text-gray-600 flex items-center gap-3">
                <span>Autosaving to connected file…</span>
                {lastSavedAt && <span className="text-green-700">Last saved: {formatDate(lastSavedAt)}</span>}
                {lastSaveError && <span className="text-red-600">Error: {lastSaveError}</span>}
              </div>
            )}
        </div>
      </header>

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

        {showPaycheckCalculator && (
          <PaycheckCalculator onClose={() => setShowPaycheckCalculator(false)} />
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

        {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}

        <ExpenseEditModal />
        <PartialPaymentModal />
        <SyncModal />

        <ViewControls />

        {currentView === 'single' && renderSinglePeriod()}
        {currentView === 'side-by-side' && renderSideBySide()}
        {currentView === 'dashboard' && renderDashboard()}
      </div>
      <footer className="text-center py-4 text-gray-500 text-sm">
        Created with &lt;3 <a href="https://www.pablocmunoz.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Pablo Munoz</a>
      </footer>
    </div>
  );
};

export default ExpenseTrackingApp;