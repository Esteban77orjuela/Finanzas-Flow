import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Calendar,
  Tag,
  Wallet,
} from 'lucide-react';
import { Category, Account, TransactionType, Frequency } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  onExecuteContext: (actions: AIAction[]) => Promise<void>;
}

export interface AIAction {
  type: 'TRANSACTION' | 'RECURRING';
  description: string;
  amount: number;
  transactionType: TransactionType;
  date: string;
  categoryName: string;
  accountName: string;
  isRecurring?: boolean;
  frequency?: Frequency;
  confidence: number;
}

const getApiKey = () => import.meta.env.VITE_GROQ_API_KEY || '';

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onExecuteContext,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<AIAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasKey = !!getApiKey();
  const [showKeyInput, setShowKeyInput] = useState(!hasKey);

  if (!isOpen) return null;

  const processPrompt = async () => {
    if (!prompt.trim()) return;
    const key = getApiKey();
    if (!key) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);
    setProposedActions([]);

    try {
      const categoriesList = categories.map((c) => c.name).join(', ');
      const accountsList = accounts.map((a) => a.name).join(', ');
      const today = new Date().toISOString().split('T')[0];

      const systemPrompt = `
        Act as a financial assistant. Today is ${today}.
        Parse the user's natural language input and extract financial actions.

        Context:
        - Available Categories: [${categoriesList}]
        - Available Accounts: [${accountsList}]

        OUTPUT ONLY VALID JSON. NO TEXT. NO MARKDOWN.
        Output format (Array of objects):
        [
          {
            "type": "TRANSACTION" | "RECURRING",
            "description": "Short logical description",
            "amount": number,
            "transactionType": "INCOME" | "EXPENSE",
            "date": "YYYY-MM-DD",
            "categoryName": "Best match from list",
            "accountName": "Best match from list",
            "frequency": "MONTHLY",
            "confidence": 1.0
          }
        ]

        Rules:
        - If the user says "fijo", "cada mes", "mensual", "todos los meses", use type "RECURRING" and frequency "MONTHLY".
        - For simple expenses or one-time income, use type "TRANSACTION".
      `;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Error en la API de Groq');
      }

      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error('No se recibió respuesta de la IA');

      let actions: AIAction[] = [];
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        actions = parsed;
      } else if (parsed.actions) {
        actions = parsed.actions;
      } else {
        const firstKey = Object.keys(parsed)[0];
        if (Array.isArray(parsed[firstKey])) {
          actions = parsed[firstKey];
        }
      }

      setProposedActions(actions);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error procesando la solicitud. Verifica tu Groq API Key.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      await onExecuteContext(proposedActions);
      onClose();
      setPrompt('');
      setProposedActions([]);
    } catch {
      setError('Error al guardar los datos en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md hidden sm:block">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">Asistente IA (Groq)</h2>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <p className="text-indigo-100 text-xs sm:text-sm truncate">
                  Describe tus movimientos y yo me encargo
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"><X size={20} /></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {!hasKey && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                ⚠️ Falta la API Key de Groq
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Para usar la inteligencia artificial, por favor agrega tu API Key en el archivo <strong>.env.local</strong> de tu proyecto de la siguiente manera:
              </p>
              <pre className="mt-2 p-2 bg-black/10 dark:bg-black/30 rounded text-xs text-amber-900 dark:text-amber-100 font-mono">
                VITE_GROQ_API_KEY=gsk_tu_clave_aqui
              </pre>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                (Y no olvides configurar esta misma variable en Vercel para cuando subas a producción).
              </p>
            </div>
          )}

          {!showKeyInput && proposedActions.length === 0 && (
            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ejemplo: 'Ayer gasté 50 mil en almuerzo (efectivo) y hoy pagué 120 mil del recibo de luz (nómina). También recuérdame pagar el gimnasio (80 mil) cada mes.'"
                className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800 dark:text-slate-200 text-lg placeholder-slate-400"
              />
              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <button
                onClick={processPrompt}
                disabled={loading || !prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <><RefreshCw className="animate-spin" /> Procesando...</> : <><Send size={20} /> Analizar y Crear</>}
              </button>
            </div>
          )}

          {proposedActions.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Propuesta de Acciones ({proposedActions.length})</h3>
              <div className="space-y-3">
                {proposedActions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className={`p-3 rounded-xl ${action.transactionType === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {action.transactionType === 'INCOME' ? <Wallet size={20} /> : <Tag size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{action.description}</h4>
                        <span className={`font-mono font-bold ${action.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {action.transactionType === 'INCOME' ? '+' : '-'}${action.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {action.date}</span>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-xs">{action.categoryName}</span>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-xs">{action.accountName}</span>
                        {action.type === 'RECURRING' && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                            🔄 Recurrente ({action.frequency})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setProposedActions([])} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button onClick={handleExecute} disabled={loading} className="flex-[2] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="animate-spin" /> : <Check size={20} />}
                  Confirmar y Guardar Todo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
