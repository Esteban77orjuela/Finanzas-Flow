import React, { useMemo } from 'react';
import { Transaction, TransactionType, Account } from '../types';
import { formatCurrency } from '../utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface NetWorthChartProps {
  transactions: Transaction[];
  accounts: Account[];
}

const NetWorthChart: React.FC<NetWorthChartProps> = ({ transactions, accounts }) => {
  const data = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }

    transactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key] += t.type === TransactionType.INCOME ? t.amount : -t.amount;
      }
    });

    const currentBalance = accounts.reduce((s, a) => s + a.balance, 0);
    let cumulative = currentBalance;
    const reversed = Object.entries(months).reverse();
    reversed.forEach(([key, val]) => {
      cumulative -= val;
      months[key] = cumulative;
    });

    return Object.entries(months).map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('es-MX', { month: 'short', year: '2-digit' }),
      netWorth: val,
    }));
  }, [transactions, accounts]);

  if (data.length === 0) return null;

  const isPositive = data[data.length - 1]?.netWorth >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-violet-500" />
        <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Patrimonio Neto Histórico</h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2.5}
            fill="url(#netWorthGrad)"
            dot={{ r: 3, fill: isPositive ? '#10b981' : '#ef4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NetWorthChart;
