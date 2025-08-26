import React, { useState } from 'react';
import { toDate } from 'date-fns';
import { X, Save } from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';

const IncomeSettings = () => {
    const { incomeSettings, setIncomeSettings, setShowIncomeSettings, triggerCelebration } = useExpenseStore(state => ({
        incomeSettings: state.incomeSettings,
        setIncomeSettings: state.setIncomeSettings,
        setShowIncomeSettings: state.setShowIncomeSettings,
        triggerCelebration: state.triggerCelebration,
    }));

    const [tempIncomeSettings, setTempIncomeSettings] = useState(incomeSettings);
    const formatDateForInput = (date) => (toDate(date) || new Date()).toISOString().split('T')[0];

    const handleSave = () => {
        setIncomeSettings(tempIncomeSettings);
        setShowIncomeSettings(false);
        triggerCelebration('Income settings saved! 💰');
    };

    const handleCancel = () => {
        setShowIncomeSettings(false);
    };

    return (
        <div className="bg-white border rounded-lg p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Income & Schedule Settings</h3>
                <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded">
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
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Paycheck A</h4>
                    <input
                        type="number" step="0.01"
                        value={tempIncomeSettings.paycheckA}
                        onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, paycheckA: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 border rounded-lg text-lg font-semibold"
                    />
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3">Paycheck B</h4>
                    <input
                        type="number" step="0.01"
                        value={tempIncomeSettings.paycheckB}
                        onChange={(e) => setTempIncomeSettings(prev => ({ ...prev, paycheckB: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 border rounded-lg text-lg font-semibold"
                    />
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold">
                    <Save className="w-4 h-4" /> Save Settings
                </button>
                <button onClick={handleCancel} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default IncomeSettings;
