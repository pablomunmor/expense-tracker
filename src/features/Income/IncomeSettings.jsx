import React, { useState } from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { Save } from 'lucide-react';

const IncomeSettings = ({ onClose }) => {
    const { incomeSettings, setIncomeSettings, triggerCelebration } = useExpenseStore(state => ({
        incomeSettings: state.incomeSettings,
        setIncomeSettings: state.setIncomeSettings,
        triggerCelebration: state.triggerCelebration,
    }));

    const [tempIncomeSettings, setTempIncomeSettings] = useState(incomeSettings);
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
    const formatDateForInput = (date) => (toDate(date) || new Date()).toISOString().split('T')[0];

    const handleSave = () => {
        setIncomeSettings(tempIncomeSettings);
        triggerCelebration('Income settings saved! 💰');
        onClose();
    };

    const handleCancel = () => {
        setTempIncomeSettings(incomeSettings);
        onClose();
    };

    return (
        <>
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
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold">
                    <Save className="w-4 h-4" /> Save Settings
                </button>
                <button onClick={handleCancel} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    Cancel
                </button>
            </div>
        </>
    );
};

export default IncomeSettings;
