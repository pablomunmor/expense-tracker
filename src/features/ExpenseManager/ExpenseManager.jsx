import React, { useEffect, useState } from 'react';
import {
  DollarSign, Edit, BarChart3, Target, Upload, Trash2, Download
} from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';
import Modal from '../../components/shared/Modal.jsx';
import IncomeSettings from '../Income/IncomeSettings.jsx';
import SourceExpenseManagement from '../Expenses/SourceExpenseManagement.jsx';
import DebtPayoffTools from '../Debt/DebtPayoffTools.jsx';
import AdvancedAnalytics from '../Analytics/AdvancedAnalytics.jsx';
import ExpenseEditModal from '../Expenses/ExpenseEditModal.jsx';
import OnboardingModal from '../../components/shared/OnboardingModal.jsx';
import CelebrationToast from '../../components/shared/CelebrationToast.jsx';
import ViewControls from './components/ViewControls.jsx';
import SinglePeriodView from './views/SinglePeriodView.jsx';
import SideBySideView from './views/SideBySideView.jsx';
import DashboardView from './views/DashboardView.jsx';
import { exportToCSV } from '../../utils/export.js';

const ExpenseManager = () => {
    const {
        showDebtTools, showAnalytics, showSourceManagement, showIncomeSettings,
        setShowDebtTools, setShowAnalytics, setShowSourceManagement, setShowIncomeSettings,
        oneOffModal, setOneOffModal, addOneOff,
        generatePeriods, updateIncomeInPeriods, sourceExpenses, incomeSettings, periods,
        currentView
    } = useExpenseStore();
    const showOnboarding = useExpenseStore(state => !state.seenOnboarding);
    const closeOnboarding = useExpenseStore(state => state.closeOnboarding);

    useEffect(() => {
        generatePeriods();
    }, [sourceExpenses, incomeSettings.startDate, incomeSettings.firstPaycheckType, generatePeriods]);

    useEffect(() => {
        if (periods.length > 0) {
            updateIncomeInPeriods();
        }
    }, [incomeSettings.paycheckA, incomeSettings.paycheckB, periods.length, updateIncomeInPeriods]);

    const packAppState = () => {
        const state = useExpenseStore.getState();
        return {
            sourceExpenses: state.sourceExpenses,
            incomeSettings: state.incomeSettings,
            periods: state.periods,
            currentView: state.currentView,
            selectedPeriod: state.selectedPeriod,
            debtStrategy: state.debtStrategy,
            extraPayment: state.extraPayment,
            undoStack: state.undoStack,
            seenOnboarding: state.seenOnboarding,
            version: 1
        };
    };

    const applyAppState = (data) => {
        if (!data || typeof data !== 'object') return;
        useExpenseStore.setState(data);
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
            useExpenseStore.getState().triggerCelebration('Successfully imported your data! 🎉');
        } catch (e) {
            console.error('Import failed:', e);
            alert('Import failed. Please check the file.');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <CelebrationToast />
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-8 h-8 text-blue-600" /> Expense & Paycheck Planner
                            </h1>
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex gap-2">
                                    <button onClick={() => setShowIncomeSettings(true)} className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2 hover:bg-green-700">
                                        <DollarSign className="w-4 h-4" /> Income Settings
                                    </button>
                                    <button onClick={() => setShowSourceManagement(true)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2 hover:bg-blue-700">
                                        <Edit className="w-4 h-4" /> Manage Expenses
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAnalytics(!showAnalytics)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                        <BarChart3 className="w-4 h-4" /> Analytics
                                    </button>
                                    <button onClick={() => setShowDebtTools(!showDebtTools)} className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${showDebtTools ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                        <Target className="w-4 h-4" /> Debt Tools
                                    </button>
                                </div>
                                <div className="flex gap-2 border-l pl-2">
                                    <button onClick={() => exportToCSV(periods)} className="px-3 py-2 bg-teal-600 text-white rounded text-sm flex items-center gap-2 hover:bg-teal-700">
                                        <Download className="w-4 h-4" /> Export CSV
                                    </button>
                                </div>
                                <div className="flex gap-2 border-l pl-2">
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
                                <div className="flex gap-2 border-l pl-2">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                                                useExpenseStore.persist.clearStorage();
                                                window.location.reload();
                                            }
                                        }}
                                        className="px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center gap-2 hover:bg-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" /> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
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
