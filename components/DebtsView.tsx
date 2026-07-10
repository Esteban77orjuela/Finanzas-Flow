import React, { useState } from 'react';
import { Debt } from '../types';
import { formatCurrency, formatCurrencyCompact } from '../utils';
import { CreditCard, Plus, Edit2, Trash2, AlertTriangle, Calendar, TrendingDown, ShieldCheck } from 'lucide-react';

interface DebtsViewProps {
  debts: Debt[];
  onAdd: () => void;
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

const DebtsView: React.FC<DebtsViewProps> = ({ debts, onAdd, onEdit, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalDebt = debts.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + d.paidAmount, 0);
  const totalRemaining = totalDebt - totalPaid;
  const overallProgress = totalDebt > 0 ? Math.min((totalPaid / totalDebt) * 100, 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard size={24} className="text-rose-500" />
            Deudas
          </h2>
          <p className="text-sm text-slate-500 mt-1">Controla y liquida tus deudas</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Deuda</span>
        </button>
      </div>

      {/* Overall Summary */}
      {debts.length > 0 && (
        <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown size={20} />
              <span className="text-sm font-medium opacity-90">Total Deuda</span>
            </div>
            <span className="text-2xl font-bold">{formatCurrency(totalRemaining)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 mb-3">
            <div
              className="bg-emerald-300 rounded-full h-3 transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-90">Pagado: {formatCurrency(totalPaid)}</span>
            <span className="opacity-70">Total: {formatCurrency(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Debts List */}
      {debts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <ShieldCheck size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Sin Deudas</h3>
          <p className="text-sm text-slate-500 mb-6">Registra tus deudas para mantener el control</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl inline-flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            Registrar Deuda
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {debts.map((debt) => {
            const progress = debt.totalAmount > 0 ? Math.min((debt.paidAmount / debt.totalAmount) * 100, 100) : 0;
            const remaining = Math.max(debt.totalAmount - debt.paidAmount, 0);
            const isPaid = progress >= 100;
            const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && !isPaid;

            return (
              <div
                key={debt.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${isPaid ? 'border-emerald-200 dark:border-emerald-900/30' : isOverdue ? 'border-rose-200 dark:border-rose-900/30' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <div className="h-2" style={{ backgroundColor: isPaid ? '#22c55e' : debt.color }} />

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 dark:text-white text-base truncate">{debt.name}</h3>
                        {isOverdue && <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" aria-label="Vencida" />}
                        {isPaid && <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" aria-label="Pagada" />}
                      </div>
                      {debt.dueDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          <Calendar size={12} />
                          <span className={isOverdue ? 'text-rose-500 font-medium' : ''}>
                            Vence: {new Date(debt.dueDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => onEdit(debt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingId(deletingId === debt.id ? null : debt.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {deletingId === debt.id && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-xl p-3 flex items-center justify-between animate-fade-in">
                      <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">¿Eliminar esta deuda?</span>
                      <div className="flex gap-2">
                        <button onClick={() => setDeletingId(null)} className="px-3 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 border text-slate-600 dark:text-slate-300">Cancelar</button>
                        <button onClick={() => { onDelete(debt.id); setDeletingId(null); }} className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white">Eliminar</button>
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{isPaid ? 'Pagada' : `${progress.toFixed(0)}% pagado`}</span>
                      <span className="font-mono">{formatCurrencyCompact(debt.paidAmount)} / {formatCurrencyCompact(debt.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className={`rounded-full h-2.5 transition-all duration-700 ease-out ${isPaid ? 'bg-emerald-500' : ''}`}
                        style={{ width: `${progress}%`, backgroundColor: isPaid ? undefined : debt.color }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-slate-500">Restante</span>
                    <span className={`font-bold text-base ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPaid ? '¡Liquidada!' : formatCurrencyCompact(remaining)}
                    </span>
                  </div>

                  {debt.notes && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-700 pt-3">
                      {debt.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DebtsView;
