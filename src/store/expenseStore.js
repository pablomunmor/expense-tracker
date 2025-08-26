import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useExpenseStore = create(
    persist(
        (set, get) => ({
            // ---------- Core State ----------
            sourceExpenses: [
                { id: 1, description: 'Rent', category: 'Housing', amount: 1200, dueDate: 1, paycheckAssignment: 'A', isDebt: false, active: true },
                { id: 2, description: 'Credit Card', category: 'Debt', amount: 150, dueDate: 15, paycheckAssignment: 'B', isDebt: true, balance: 3500, apr: 18.5, minimumPayment: 150, active: true },
                { id: 3, description: 'Groceries', category: 'Food', amount: 400, dueDate: 10, paycheckAssignment: 'A', isDebt: false, active: true },
                { id: 4, description: 'Car Payment', category: 'Transportation', amount: 350, dueDate: 20, paycheckAssignment: 'B', isDebt: true, balance: 8500, apr: 4.5, minimumPayment: 350, active: true },
                { id: 5, description: 'Utilities', category: 'Housing', amount: 150, dueDate: 5, paycheckAssignment: 'A', isDebt: false, active: true },
                { id: 6, description: 'Student Loan', category: 'Debt', amount: 200, dueDate: 25, paycheckAssignment: 'B', isDebt: true, balance: 15000, apr: 6.8, minimumPayment: 200, active: true },
            ],
            incomeSettings: {
                paycheckA: 2800,
                paycheckB: 2800,
                startDate: new Date(),
                firstPaycheckType: 'A'
            },
            periods: [],
            currentView: 'single',
            selectedPeriod: 0,
            debtStrategy: 'avalanche',
            extraPayment: 0,
            undoStack: [],
            seenOnboarding: false,

            // ---------- UI State ----------
            showDebtTools: false,
            showAnalytics: false,
            showSourceManagement: false,
            showIncomeSettings: false,
            editingExpense: null,
            oneOffModal: { open: false, periodId: null, editingId: null, fields: null },
            expenseModal: { open: false, expense: null, periodId: null },
            celebration: { show: false, message: '' },

            // ---------- Actions ----------
            setSourceExpenses: (sourceExpenses) => set({ sourceExpenses }),
            setIncomeSettings: (incomeSettings) => set({ incomeSettings }),
            setPeriods: (periods) => set({ periods }),
            setCurrentView: (currentView) => set({ currentView }),
            setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
            setDebtStrategy: (debtStrategy) => set({ debtStrategy }),
            setExtraPayment: (extraPayment) => set({ extraPayment }),
            setUndoStack: (undoStack) => set({ undoStack }),

            setShowDebtTools: (show) => set({ showDebtTools: show }),
            setShowAnalytics: (show) => set({ showAnalytics: show }),
            setShowSourceManagement: (show) => set({ showSourceManagement: show }),
            setShowIncomeSettings: (show) => set({ showIncomeSettings: show }),
            setEditingExpense: (expense) => set({ editingExpense: expense }),
            setOneOffModal: (modalState) => set({ oneOffModal: modalState }),
            setExpenseModal: (modalState) => set({ expenseModal: modalState }),
            closeOnboarding: () => set({ seenOnboarding: true }),
            triggerCelebration: (message) => {
                set({ celebration: { show: true, message } });
                setTimeout(() => set({ celebration: { show: false, message: '' } }), 3000);
            },

            // --- Logic-heavy actions ---
            addOneOff: (periodId, fields) => {
                set(state => {
                    const copy = structuredClone(state.periods);
                    const p = copy.find(x => x.id === periodId);
                    if (!p.oneOffExpenses) p.oneOffExpenses = [];
                    p.oneOffExpenses.push({
                        id: makeId(),
                        isOneOff: true,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        ...fields
                    });
                    return { periods: copy };
                });
                get().triggerCelebration('One-off expense added! 📋');
            },
            updateOneOff: (periodId, id, patch) => {
                set(state => {
                    const copy = structuredClone(state.periods);
                    const p = copy.find(x => x.id === periodId);
                    const i = (p.oneOffExpenses || []).findIndex(e => e.id === id);
                    if (i >= 0) p.oneOffExpenses[i] = { ...p.oneOffExpenses[i], ...patch, updatedAt: new Date().toISOString() };
                    return { periods: copy };
                });
            },
            _addExpense: (expense, periodId) => {
                set(state => {
                    const newPeriods = structuredClone(state.periods);
                    const period = newPeriods.find(p => p.id === periodId);
                    if (period) {
                        if (expense.isOneOff) {
                            period.oneOffExpenses.push(expense);
                        } else {
                            period.expenses.push(expense);
                            period.excludedExpenseIds = (period.excludedExpenseIds || []).filter(id => id !== expense.id);
                        }
                    }
                    return { periods: newPeriods };
                });
            },
            deleteEditingExpense: () => {
                const { expenseModal } = get();
                if (!expenseModal.expense) return;

                const undoAction = {
                    type: 'ADD_EXPENSE',
                    payload: {
                        expense: expenseModal.expense,
                        periodId: expenseModal.periodId,
                    }
                };
                set(state => ({ undoStack: [...state.undoStack.slice(-9), undoAction] }));

                set(state => {
                    const newPeriods = structuredClone(state.periods);
                    const period = newPeriods.find(p => p.id === expenseModal.periodId);
                    if (period) {
                        if (expenseModal.expense.isOneOff) {
                            period.oneOffExpenses = (period.oneOffExpenses || []).filter(e => e.id !== expenseModal.expense.id);
                        } else {
                            period.expenses = (period.expenses || []).filter(e => e.id !== expenseModal.expense.id);
                            period.excludedExpenseIds = [...(period.excludedExpenseIds || []), expenseModal.expense.id];
                        }
                    }
                    return { periods: newPeriods };
                });
                get().triggerCelebration(`Deleted "${expenseModal.expense.description}". You can Undo.`);
                get().setExpenseModal({ open: false, expense: null, periodId: null });
            },
            generatePeriods: () => {
                const { sourceExpenses, incomeSettings, periods: prevPeriods } = get();
                const generatedPeriods = [];
                for (let i = 0; i < 24; i++) {
                    const startBase = toDate(incomeSettings.startDate) || new Date();
                    const periodDate = new Date(startBase);
                    periodDate.setDate(startBase.getDate() + (i * 14));
                    const isAPaycheck = incomeSettings.firstPaycheckType === 'A' ? i % 2 === 0 : i % 2 === 1;

                    const existingPeriod = prevPeriods.find(p => p.id === i);
                    const existingOneOffs = existingPeriod?.oneOffExpenses || [];

                    let periodExpenses = [];
                    if (existingPeriod && existingPeriod.expenses && existingPeriod.expenses.length > 0) {
                        periodExpenses = existingPeriod.expenses.map(exp => {
                            const templateExp = sourceExpenses.find(se => se.id === exp.id && se.active);
                            if (templateExp) {
                                const isIndividuallyModified = exp.amount !== templateExp.amount ||
                                    exp.description !== templateExp.description ||
                                    exp.category !== templateExp.category ||
                                    exp.status !== 'pending' ||
                                    exp.notes ||
                                    exp.periodId !== i;
                                if (!isIndividuallyModified) {
                                    return { ...templateExp, periodId: i, status: exp.status || 'pending', amountCleared: exp.amountCleared || templateExp.amount, position: exp.position ?? 0 };
                                }
                            }
                            return exp;
                        });
                        const templateExpenses = sourceExpenses.filter(exp =>
                            exp.active &&
                            exp.paycheckAssignment === (isAPaycheck ? 'A' : 'B') &&
                            !periodExpenses.some(pe => pe.id === exp.id) &&
                            !(existingPeriod?.excludedExpenseIds || []).includes(exp.id)
                        );
                        templateExpenses.forEach(exp => {
                            periodExpenses.push({ ...exp, periodId: i, status: 'pending', amountCleared: exp.amount, position: (periodExpenses.reduce((m, e) => Math.max(m, (e.position ?? -1)), -1) + 1) });
                        });
                    } else {
                        periodExpenses = sourceExpenses
                            .filter(exp => exp.active && exp.paycheckAssignment === (isAPaycheck ? 'A' : 'B'))
                            .map((exp) => ({ ...exp, periodId: i, status: 'pending', amountCleared: exp.amount, position: (periodExpenses.reduce((m, e) => Math.max(m, (e.position ?? -1)), -1) + 1) }));
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
                        oneOffExpenses: existingOneOffs,
                        excludedExpenseIds: existingPeriod?.excludedExpenseIds || []
                    });
                }
                set({ periods: generatedPeriods });
            },
            updateIncomeInPeriods: () => {
                set(state => ({
                    periods: state.periods.map(period => ({
                        ...period,
                        defaultIncome: period.type === 'A' ? state.incomeSettings.paycheckA : state.incomeSettings.paycheckB,
                    }))
                }));
            },
            handleUndo: () => {
                const { undoStack, _moveExpense, _addExpense } = get();
                if (undoStack.length > 0) {
                    const lastAction = undoStack[undoStack.length - 1];
                    set({ undoStack: undoStack.slice(0, -1) });

                    if (lastAction.type === 'MOVE_EXPENSE') {
                        const { expense, fromPeriodId, toPeriodId } = lastAction.payload;
                        _moveExpense(expense, fromPeriodId, toPeriodId);
                    } else if (lastAction.type === 'ADD_EXPENSE') {
                        const { expense, periodId } = lastAction.payload;
                        _addExpense(expense, periodId);
                    }
                    get().triggerCelebration('Undone! 🔄');
                }
            },
            updateExpenseStatus: (periodId, expenseId, newStatus) => {
                set(state => ({
                    periods: state.periods.map(period => {
                        if (period.id !== periodId) return period;
                        return {
                            ...period,
                            expenses: period.expenses.map(exp => {
                                if (exp.id !== expenseId) return exp;
                                return { ...exp, status: newStatus, amountCleared: newStatus === 'cleared' ? exp.amount : exp.amountCleared };
                            })
                        };
                    })
                }));
                if (newStatus === 'cleared') get().triggerCelebration('Expense cleared! ✅');
                else if (newStatus === 'paid') get().triggerCelebration('Payment recorded! 💳');
            },
            handleExpenseModalSave: (updatedExpense, editScope) => {
                const { expenseModal, periods } = get();
                if (editScope === 'template') {
                    set(state => ({
                        sourceExpenses: state.sourceExpenses.map(exp =>
                            exp.id === updatedExpense.id ? { ...updatedExpense, active: true } : exp
                        )
                    }));
                    const currentPeriodIndex = periods.findIndex(p => p.id === expenseModal.periodId);
                    set(state => ({
                        periods: state.periods.map((period, index) => {
                            if (index < currentPeriodIndex) return period;
                            return {
                                ...period,
                                expenses: (period.expenses || []).map(exp =>
                                    exp.id === updatedExpense.id ? {
                                        ...exp, ...updatedExpense, periodId: period.id,
                                        status: index === currentPeriodIndex ? updatedExpense.status : 'pending'
                                    } : exp
                                )
                            };
                        })
                    }));
                    get().triggerCelebration('Expense updated for this and all future paychecks! 🔄');
                } else {
                     set(state => ({
                        periods: state.periods.map(period => {
                            if (period.id !== expenseModal.periodId) return period;
                            if (updatedExpense.isOneOff) {
                                return { ...period, oneOffExpenses: period.oneOffExpenses.map(exp => exp.id === updatedExpense.id ? { ...updatedExpense, updatedAt: new Date().toISOString() } : exp) };
                            } else {
                                return { ...period, expenses: period.expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp) };
                            }
                        })
                    }));
                    get().triggerCelebration('Expense updated! ✨');
                }
                get().setExpenseModal({ open: false, expense: null, periodId: null });
            },
            _moveExpense: (expense, fromPeriodId, toPeriodId) => {
                set(state => {
                    const newPeriods = structuredClone(state.periods);
                    const fromPeriod = newPeriods.find(p => p.id === fromPeriodId);
                    const toPeriod = newPeriods.find(p => p.id === toPeriodId);
                    if (expense.isOneOff) {
                        fromPeriod.oneOffExpenses = (fromPeriod.oneOffExpenses || []).filter(e => e.id !== expense.id);
                        toPeriod.oneOffExpenses = toPeriod.oneOffExpenses || [];
                        toPeriod.oneOffExpenses.push({ ...expense, periodId: toPeriodId, status: 'pending', updatedAt: new Date().toISOString() });
                    } else {
                        fromPeriod.expenses = (fromPeriod.expenses || []).filter(e => e.id !== expense.id);
                        fromPeriod.excludedExpenseIds = [...(fromPeriod.excludedExpenseIds || []), expense.id];
                        toPeriod.excludedExpenseIds = (toPeriod.excludedExpenseIds || []).filter(id => id !== expense.id);
                        toPeriod.expenses.push({ ...expense, periodId: toPeriodId, status: 'pending', amountCleared: expense.amount, updatedAt: new Date().toISOString() });
                    }
                    return { periods: newPeriods };
                });
            },
            moveExpense: (expense, fromPeriodId, direction) => {
                const { periods, _moveExpense } = get();
                const fromPeriodIndex = periods.findIndex(p => p.id === fromPeriodId);
                const toPeriodIndex = direction === 'forward' ? fromPeriodIndex + 1 : fromPeriodIndex - 1;
                if (toPeriodIndex < 0 || toPeriodIndex >= periods.length) return;

                const toPeriodId = periods[toPeriodIndex].id;

                const undoAction = {
                    type: 'MOVE_EXPENSE',
                    payload: {
                        expense,
                        fromPeriodId: toPeriodId,
                        toPeriodId: fromPeriodId,
                    }
                };
                set(state => ({ undoStack: [...state.undoStack.slice(-9), undoAction] }));

                _moveExpense(expense, fromPeriodId, toPeriodId);
                get().triggerCelebration(`Moved "${expense.description}" to ${direction === 'forward' ? 'next' : 'previous'} paycheck! 📦`);
            }
        }),
        {
            name: 'expense-tracker-storage',
            storage: createJSONStorage(() => localStorage, {
                reviver: (key, value) => {
                    if (key === 'incomeSettings' && value.startDate) {
                        return { ...value, startDate: toDate(value.startDate) };
                    }
                    if (key === 'periods' && Array.isArray(value)) {
                        return value.map(p => ({
                            ...p,
                            startDate: toDate(p.startDate),
                            endDate: toDate(p.endDate),
                        }));
                    }
                    return value;
                },
            }),
            partialize: (state) =>
                Object.fromEntries(
                    Object.entries(state).filter(([key]) => ![
                        'showDebtTools', 'showAnalytics', 'showSourceManagement', 'showIncomeSettings',
                        'editingExpense', 'oneOffModal', 'expenseModal', 'celebration'
                    ].includes(key))
                ),
        }
    )
);
