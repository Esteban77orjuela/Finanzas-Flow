import React, { useMemo } from 'react';
import { Transaction, TransactionType, Account } from '../types';
import { formatCurrency } from '../utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface EvolutionChartProps {
  transactions: Transaction[];
  accounts: Account[];
}

const EvolutionChart: React.FC<EvolutionChartProps> = ({ transactions, accounts }) => {
  const data = useMemo(() => {
    const months: Record<string, { income: number; expense: number; balance: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { income: 0, expense: 0, balance: 0 };
    }

    transactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        if (t.type === TransactionType.INCOME) months[key].income += t.amount;
        else months[key].expense += t.amount;
      }
    });

    let runningBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const reversed = Object.entries(months).reverse();
    reversed.forEach(([key, val]) => {
      val.balance = runningBalance;
      runningBalance = runningBalance - val.income + val.expense;
    });

    return Object.entries(months).map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('es-MX', { month: 'short' }),
      Ingresos: val.income,
      Gastos: val.expense,
      Balance: val.balance,
    }));
  }, [transactions, accounts]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-primary-500" />
        <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Evolución Mensual</h3>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvolutionChart;
