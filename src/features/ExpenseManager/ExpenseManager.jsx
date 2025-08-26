import React, { useState, useEffect } from 'react';
import { toDate } from 'date-fns';
import {
  Calendar, DollarSign, CreditCard, TrendingUp, Settings, Edit, Trash2, Save, X,
  Download, Upload, BarChart3, Target, Calculator, PieChart, LineChart, RotateCcw,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';

import { useExpenseStore } from '../../store/expenseStore.js';
import { formatCurrency, formatDate } from '../../utils/formatting.js';
import { calculatePeriodTotals, calculateDebtPayoff } from '../../utils/calculations.js';
import { getAnalyticsData } from '../../utils/analytics.js';
import { exportToCSV } from '../../utils/export.js';

import ExpenseForm from '../Expenses/ExpenseForm.jsx';
import CelebrationToast from '../../components/ui/CelebrationToast.jsx';
import OnboardingModal from '../../components/ui/OnboardingModal.jsx';
import IncomeSettings from '../../features/Income/IncomeSettings.jsx';
import SourceExpenseManagement from '../../features/Expenses/components/SourceExpenseManagement.jsx';
import DebtPayoffTools from '../../features/Debt/DebtPayoffTools.jsx';
import AdvancedAnalytics from '../../features/Analytics/AdvancedAnalytics.jsx';
import PeriodHeader from '../../features/Periods/components/PeriodHeader.jsx';
import ExpenseEditModal from '../../features/Expenses/components/ExpenseEditModal.jsx';
import ExpenseItem from '../../features/Expenses/components/ExpenseItem.jsx';
import SinglePeriodView from '../../views/SinglePeriodView.jsx';
import SideBySideView from '../../views/SideBySideView.jsx';
import DashboardView from '../../views/DashboardView.jsx';
import Modal from '../../components/ui/Modal.jsx';
import OneOffExpenseModal from './Expenses/components/OneOffExpenseModal.jsx';

const SIDE_BY_SIDE_COUNT = 4;

const ExpenseManager = () => {
  // Get ALL state and actions from the Zustand store
  const {
    sourceExpenses, incomeSettings, periods, currentView, selectedPeriod, debtStrategy, extraPayment, undoStack, seenOnboarding,
    showDebtTools, showAnalytics, showSourceManagement, showIncomeSettings, expenseModal,
    setSourceExpenses, setIncomeSettings, setCurrentView, setSelectedPeriod, setDebtStrategy, setExtraPayment,
    setShowDebtTools, setShowAnalytics, setShowSourceManagement, setShowIncomeSettings, setExpenseModal,
    closeOnboarding, triggerCelebration, generatePeriods, updateIncomeInPeriods, moveExpense, handleUndo,
    updateExpenseStatus, handleExpenseModalSave, addOneOff, updateOneOff, deleteEditingExpense, setEditingExpense,
    oneOffModal, setOneOffModal
  } = useExpenseStore(state => state);

  const editingExpense = useExpenseStore(state => state.editingExpense);

  // State for things not in the store (side-effects, local UI state)
  const [syncHandle, setSyncHandle] = useState(null);
  const [lastSaveError, setLastSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const fsSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  // Initial data generation and effectful updates
  useEffect(() => {
    if (periods.length === 0 && !seenOnboarding) {
      generatePeriods();
    }
  }, [periods.length, seenOnboarding, generatePeriods]);

  useEffect(() => {
    generatePeriods();
  }, [sourceExpenses, incomeSettings.startDate, incomeSettings.firstPaycheckType, generatePeriods]);

  useEffect(() => {
    updateIncomeInPeriods();
  }, [incomeSettings.paycheckA, incomeSettings.paycheckB, updateIncomeInPeriods]);


  // ---------- Import/Export & Sync helpers ----------
  const packAppState = () => ({
    sourceExpenses, incomeSettings, periods, currentView, selectedPeriod, debtStrategy, extraPayment, undoStack, version: 1
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
    useExpenseStore.getState().setPeriods(rehydratedPeriods);
    setCurrentView(data.currentView || 'single');
    setSelectedPeriod(Number.isInteger(data.selectedPeriod) ? data.selectedPeriod : 0);
    setDebtStrategy(data.debtStrategy || 'avalanche');
    setExtraPayment(data.extraPayment ?? 0);
    useExpenseStore.getState().setUndoStack(Array.isArray(data.undoStack) ? data.undoStack : []);
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

  const categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other'];

  // ---------- UI subcomponents ----------
  // These will be extracted into their own files next.

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <CelebrationToast />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Expense & Paycheck Planner</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowIncomeSettings(true)}>Income</button>
            <button onClick={() => setShowSourceManagement(true)}>Expenses</button>
            <button onClick={() => setShowAnalytics(true)}>Analytics</button>
            <button onClick={() => setShowDebtTools(true)}>Debt Tools</button>
            {undoStack.length > 0 && <button onClick={handleUndo}>Undo</button>}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setCurrentView('single')} disabled={currentView === 'single'}>Single</button>
          <button onClick={() => setCurrentView('side-by-side')} disabled={currentView === 'side-by-side'}>Side-by-Side</button>
          <button onClick={() => setCurrentView('dashboard')} disabled={currentView === 'dashboard'}>Dashboard</button>
        </div>

        <Modal isOpen={showIncomeSettings} onClose={() => setShowIncomeSettings(false)} title="Income & Schedule Settings">
            <IncomeSettings />
        </Modal>
        <Modal isOpen={showSourceManagement} onClose={() => setShowSourceManagement(false)} title="Source of Truth Expenses">
            <SourceExpenseManagement />
        </Modal>
        <Modal isOpen={showDebtTools} onClose={() => setShowDebtTools(false)} title="Debt Payoff Calculator">
            <DebtPayoffTools />
        </Modal>
        <Modal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} title="Financial Analytics">
            <AdvancedAnalytics />
        </Modal>

        <OneOffExpenseModal />
        {seenOnboarding === false && <OnboardingModal />}
        <ExpenseEditModal />

        {currentView === 'single' && <SinglePeriodView />}
        {currentView === 'side-by-side' && <SideBySideView />}
        {currentView === 'dashboard' && <DashboardView />}
      </div>
    </div>
  );
};

export default ExpenseManager;