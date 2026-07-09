import React, { useState } from 'react';
import { Goal } from '../types';
import { formatCurrency, formatCurrencyCompact } from '../utils';
import { Target, Plus, Edit2, Trash2, ChevronRight, PiggyBank, TrendingUp, Calendar, Trophy } from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

const GoalsView: React.FC<GoalsViewProps> = ({ goals, onAdd, onEdit, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Trophy size={24} className="text-amber-500" />
            Metas de Ahorro
          </h2>
          <p className="text-sm text-slate-500 mt-1">Alcanza tus sueños paso a paso</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Meta</span>
        </button>
      </div>

      {/* Overall Progress */}
      {goals.length > 0 && (
        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={20} />
              <span className="text-sm font-medium opacity-90">Progreso General</span>
            </div>
            <span className="text-2xl font-bold">{overallProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 mb-3">
            <div
              className="bg-white rounded-full h-3 transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-90">{formatCurrency(totalSaved)}</span>
            <span className="opacity-70">Meta: {formatCurrency(totalTarget)}</span>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <Target size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Sin Metas Aún</h3>
          <p className="text-sm text-slate-500 mb-6">Define tus metas de ahorro y sigue tu progreso</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl inline-flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            Crear Primera Meta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
            const targetDate = new Date(goal.targetDate + '-01');
            const targetLabel = targetDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' });

            const getProgressColor = () => {
              if (progress >= 100) return 'bg-emerald-500';
              if (progress >= 60) return 'bg-emerald-400';
              if (progress >= 30) return 'bg-amber-400';
              return 'bg-rose-400';
            };

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Color top bar */}
                <div className="h-2" style={{ backgroundColor: goal.color }} />

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-base">{goal.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{targetLabel}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingId(deletingId === goal.id ? null : goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {deletingId === goal.id && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-xl p-3 flex items-center justify-between animate-fade-in">
                      <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">¿Eliminar esta meta?</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 border text-slate-600 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => { onDelete(goal.id); setDeletingId(null); }}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress Ring */}
                  <div className="flex items-center gap-5">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-700" />
                        <circle
                          cx="36" cy="36" r="30" fill="none" strokeWidth="6"
                          strokeLinecap="round"
                          stroke={goal.color}
                          strokeDasharray={`${(progress / 100) * 188.5} 188.5`}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold" style={{ color: goal.color }}>{progress.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Ahorrado</span>
                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrencyCompact(goal.currentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Meta</span>
                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrencyCompact(goal.targetAmount)}</span>
                      </div>
                      {remaining > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Faltan</span>
                          <span className="font-bold text-rose-500">{formatCurrencyCompact(remaining)}</span>
                        </div>
                      )}
                      {progress >= 100 && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                          <TrendingUp size={14} />
                          ¡Meta cumplida!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsView;
