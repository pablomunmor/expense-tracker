import React, { useState, useCallback } from 'react';
import { X, Calculator } from 'lucide-react';

// 2024 Tax Data
const TAX_DATA = {
  2024: {
    federalBrackets: {
      single: [
        { rate: 0.10, upto: 11600 },
        { rate: 0.12, upto: 47150 },
        { rate: 0.22, upto: 100525 },
        { rate: 0.24, upto: 191950 },
        { rate: 0.32, upto: 243725 },
        { rate: 0.35, upto: 609350 },
        { rate: 0.37, upto: Infinity },
      ],
      married: [
        { rate: 0.10, upto: 23200 },
        { rate: 0.12, upto: 94300 },
        { rate: 0.22, upto: 201050 },
        { rate: 0.24, upto: 383900 },
        { rate: 0.32, upto: 487450 },
        { rate: 0.35, upto: 731200 },
        { rate: 0.37, upto: Infinity },
      ],
    },
    standardDeduction: {
      single: 14600,
      married: 29200,
    },
    fica: {
      socialSecurity: {
        rate: 0.062,
        wageLimit: 168600,
      },
      medicare: {
        rate: 0.0145,
      },
    },
  },
};

const PaycheckCalculator = ({ onClose }) => {
  const [grossPay, setGrossPay] = useState('');
  const [payFrequency, setPayFrequency] = useState('bi-weekly');
  const [filingStatus, setFilingStatus] = useState('single');
  const [preTaxDeductions, setPreTaxDeductions] = useState({
    '401k': { type: 'percentage', value: '' },
    insurance: '',
  });
  const [results, setResults] = useState(null);

  const calculateTaxes = useCallback(() => {
    const payPeriodGross = parseFloat(grossPay);
    if (isNaN(payPeriodGross) || payPeriodGross <= 0) {
      setResults(null);
      return;
    }

    const payPeriodsPerYear = {
      weekly: 52,
      'bi-weekly': 26,
      'semi-monthly': 24,
      monthly: 12,
    }[payFrequency];

    const annualGrossPay = payPeriodGross * payPeriodsPerYear;

    // Calculate pre-tax deductions
    let four01kContribution = 0;
    if (preTaxDeductions['401k'].value) {
      const val = parseFloat(preTaxDeductions['401k'].value);
      if (preTaxDeductions['401k'].type === 'percentage') {
        four01kContribution = payPeriodGross * (val / 100);
      } else {
        four01kContribution = val;
      }
    }
    const insuranceDeduction = parseFloat(preTaxDeductions.insurance || 0);
    const totalPreTaxDeductions = four01kContribution + insuranceDeduction;
    const annualPreTaxDeductions = totalPreTaxDeductions * payPeriodsPerYear;

    // Calculate taxable income for federal tax
    const taxableIncome = Math.max(0, annualGrossPay - annualPreTaxDeductions - TAX_DATA[2024].standardDeduction[filingStatus]);

    // Calculate Federal Income Tax
    let federalTax = 0;
    let remainingIncome = taxableIncome;
    let previousLimit = 0;
    for (const bracket of TAX_DATA[2024].federalBrackets[filingStatus]) {
      if (remainingIncome > 0) {
        const taxableInBracket = Math.min(remainingIncome, bracket.upto - previousLimit);
        federalTax += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
        previousLimit = bracket.upto;
      }
    }
    const federalTaxPerPeriod = federalTax / payPeriodsPerYear;

    // Calculate FICA Taxes
    const socialSecurityTaxablePay = Math.min(annualGrossPay, TAX_DATA[2024].fica.socialSecurity.wageLimit);
    const annualSocialSecurityTax = socialSecurityTaxablePay * TAX_DATA[2024].fica.socialSecurity.rate;
    // This is a simplification; in reality, SS tax stops mid-year. This averages it out.
    const socialSecurityTaxPerPeriod = annualSocialSecurityTax / payPeriodsPerYear;

    const annualMedicareTax = annualGrossPay * TAX_DATA[2024].fica.medicare.rate;
    const medicareTaxPerPeriod = annualMedicareTax / payPeriodsPerYear;

    const netPay = payPeriodGross - federalTaxPerPeriod - socialSecurityTaxPerPeriod - medicareTaxPerPeriod - totalPreTaxDeductions;

    setResults({
      grossPay: payPeriodGross,
      federalTax: federalTaxPerPeriod,
      socialSecurity: socialSecurityTaxPerPeriod,
      medicare: medicareTaxPerPeriod,
      otherDeductions: totalPreTaxDeductions,
      netPay: netPay,
    });
  }, [grossPay, payFrequency, filingStatus, preTaxDeductions]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Paycheck Calculator
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Gross Pay (per period)</label>
              <input
                type="number"
                value={grossPay}
                onChange={(e) => setGrossPay(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., 3000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pay Frequency</label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="semi-monthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filing Status</label>
              <select
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="single">Single</option>
                <option value="married">Married Filing Jointly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">401(k) Contribution (pre-tax)</label>
              <div className="flex">
                <input
                  type="number"
                  value={preTaxDeductions['401k'].value}
                  onChange={(e) =>
                    setPreTaxDeductions((prev) => ({
                      ...prev,
                      '401k': { ...prev['401k'], value: e.target.value },
                    }))
                  }
                  className="w-full p-2 border rounded-l"
                  placeholder="e.g., 5"
                />
                <select
                  value={preTaxDeductions['401k'].type}
                  onChange={(e) =>
                    setPreTaxDeductions((prev) => ({
                      ...prev,
                      '401k': { ...prev['401k'], type: e.target.value },
                    }))
                  }
                  className="p-2 border-t border-b border-r rounded-r bg-gray-50"
                >
                  <option value="percentage">%</option>
                  <option value="amount">$</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Insurance & Other Pre-tax Deductions (per period)</label>
              <input
                type="number"
                value={preTaxDeductions.insurance}
                onChange={(e) =>
                  setPreTaxDeductions((prev) => ({
                    ...prev,
                    insurance: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded"
                placeholder="e.g., 200"
              />
            </div>
            <button
              onClick={calculateTaxes}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Calculate
            </button>
          </div>

          {/* Results Section */}
          <div className={`bg-gray-50 p-4 rounded-lg transition-opacity duration-300 ${results ? 'opacity-100' : 'opacity-0'}`}>
            {results && (
              <>
                <h4 className="text-lg font-semibold mb-4 text-center">Estimated Take-Home Pay</h4>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-green-600">${results.netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-600">per paycheck</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Gross Pay</span>
                    <span>${results.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Federal Income Tax</span>
                    <span>-${results.federalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Social Security</span>
                    <span>-${results.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Medicare</span>
                    <span>-${results.medicare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Pre-tax Deductions</span>
                    <span>-${results.otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2 text-base">
                    <span>Net Pay</span>
                    <span>${results.netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaycheckCalculator;
