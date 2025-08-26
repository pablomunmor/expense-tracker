export const calculatePeriodTotals = (period) => {
    const totalIncome = period.defaultIncome + period.additionalIncome;
    const baseExpenses = period.expenses || [];
    const oneOffs = period.oneOffExpenses || [];
    const totalExpenses =
        baseExpenses.reduce((sum, exp) => sum + exp.amount, 0) +
        oneOffs.reduce((sum, exp) => sum + exp.amount, 0);
    const totalPaid =
        baseExpenses
            .filter(exp => exp.status === 'paid' || exp.status === 'cleared')
            .reduce((sum, exp) => sum + (exp.amountCleared ?? exp.amount), 0) +
        oneOffs
            .filter(exp => exp.status === 'paid' || exp.status === 'cleared')
            .reduce((sum, exp) => sum + exp.amount, 0);
    const unpaidAmount =
        baseExpenses
            .filter(exp => exp.status === 'pending' || exp.status === 'paid')
            .reduce((sum, exp) => sum + exp.amount, 0) +
        oneOffs
            .filter(exp => exp.status === 'pending' || exp.status === 'paid')
            .reduce((sum, exp) => sum + exp.amount, 0);
    return { totalIncome, totalExpenses, totalPaid, unpaidAmount, difference: totalIncome - totalExpenses, remainingAfterPaid: totalIncome - totalPaid };
};

export const calculateDebtPayoff = (sourceExpenses, debtStrategy, extraPayment) => {
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
