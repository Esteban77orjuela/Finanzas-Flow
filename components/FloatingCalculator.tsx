import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calculator, X } from 'lucide-react';

type Operator = '+' | '-' | '×' | '÷';

const operatorSymbols: Record<string, Operator> = {
  '+': '+',
  '-': '-',
  '*': '×',
  'x': '×',
  'X': '×',
  '/': '÷',
};

const formatResult = (value: number): string => {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  const trimmed = value.toFixed(10).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, '');
  return trimmed.length ? trimmed : '0';
};

const FloatingCalculator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  const resetAll = useCallback(() => {
    setDisplay('0');
    setPendingOperator(null);
    setStoredValue(null);
    setShouldResetDisplay(false);
  }, []);

  const inputDigit = useCallback((digit: string) => {
    setDisplay(prev => {
      if (prev === 'Error' || shouldResetDisplay || prev === '0') {
        setShouldResetDisplay(false);
        return digit;
      }
      return prev + digit;
    });
  }, [shouldResetDisplay]);

  const inputDecimal = useCallback(() => {
    setDisplay(prev => {
      if (prev === 'Error' || shouldResetDisplay) {
        setShouldResetDisplay(false);
        return '0.';
      }
      if (prev.includes('.')) {
        return prev;
      }
      return `${prev}.`;
    });
  }, [shouldResetDisplay]);

  const removeLast = useCallback(() => {
    setDisplay(prev => {
      if (prev === 'Error') {
        resetAll();
        return '0';
      }
      if (shouldResetDisplay) {
        setShouldResetDisplay(false);
        return '0';
      }
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [resetAll, shouldResetDisplay]);

  const performOperation = useCallback((first: number, second: number, operator: Operator): number | 'Error' => {
    switch (operator) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '×':
        return first * second;
      case '÷':
        if (second === 0) {
          return 'Error';
        }
        return first / second;
      default:
        return second;
    }
  }, []);

  const commitCalculation = useCallback((nextOperator: Operator | null) => {
    const currentValue = display === 'Error' ? 0 : parseFloat(display);

    if (storedValue === null || pendingOperator === null) {
      setStoredValue(currentValue);
      setPendingOperator(nextOperator);
      setShouldResetDisplay(true);
      return;
    }

    const result = performOperation(storedValue, currentValue, pendingOperator);
    if (result === 'Error') {
      setDisplay('Error');
      setStoredValue(null);
      setPendingOperator(null);
      setShouldResetDisplay(true);
      return;
    }

    setDisplay(formatResult(result));
    setStoredValue(result);
    setPendingOperator(nextOperator);
    setShouldResetDisplay(true);
  }, [display, pendingOperator, performOperation, storedValue]);

  const handleOperator = useCallback((operator: Operator) => {
    if (display === 'Error') {
      resetAll();
      return;
    }

    if (shouldResetDisplay) {
      setPendingOperator(operator);
      return;
    }

    commitCalculation(operator);
  }, [commitCalculation, display, resetAll, shouldResetDisplay]);

  const evaluateResult = useCallback(() => {
    if (display === 'Error') {
      resetAll();
      return;
    }

    if (pendingOperator === null || storedValue === null) {
      return;
    }

    commitCalculation(null);
  }, [commitCalculation, display, pendingOperator, resetAll, storedValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputDigit(key);
        return;
      }

      if (key === '.') {
        event.preventDefault();
        inputDecimal();
        return;
      }

      if (key in operatorSymbols) {
        event.preventDefault();
        handleOperator(operatorSymbols[key]);
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        evaluateResult();
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        removeLast();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        resetAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evaluateResult, handleOperator, inputDecimal, inputDigit, isOpen, removeLast, resetAll]);

  const buttons = useMemo(() => ([
    { label: 'C', action: resetAll, tone: 'danger' as const, span: 2 },
    { label: '⌫', action: removeLast, tone: 'muted' as const },
    { label: '÷', action: () => handleOperator('÷'), tone: 'accent' as const },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '×', action: () => handleOperator('×'), tone: 'accent' as const },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '-', action: () => handleOperator('-'), tone: 'accent' as const },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '+', action: () => handleOperator('+'), tone: 'accent' as const },
    { label: '0', action: () => inputDigit('0'), span: 2 },
    { label: '.', action: inputDecimal },
    { label: '=', action: evaluateResult, tone: 'accent' as const },
  ]), [evaluateResult, handleOperator, inputDecimal, inputDigit, removeLast, resetAll]);

  return (
    <div className="fixed bottom-44 right-6 md:right-12 z-[70] flex flex-col items-end gap-3">
      <div
        className={[
          'w-[min(calc(100vw-2rem),18rem)] sm:w-72 rounded-2xl border backdrop-blur-lg shadow-xl transition-all duration-200 ease-out origin-bottom-right',
          'bg-white/75 border-white/40 dark:bg-slate-900/80 dark:border-slate-600/60',
          'p-4 space-y-4',
          isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        ].join(' ')}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Calculadora</span>
          {pendingOperator && storedValue !== null && (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {formatResult(storedValue)} {pendingOperator}
            </span>
          )}
        </div>
        <div className="flex items-end justify-end">
          <span className="text-3xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums break-all">{display}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {buttons.map(({ label, action, tone, span }, idx) => (
            <button
              key={`${label}-${idx}`}
              type="button"
              onClick={action}
              className={[
                'rounded-full py-3 text-lg font-semibold transition-colors duration-150 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'backdrop-blur-sm',
                span === 2 ? 'col-span-2' : '',
                tone === 'accent'
                  ? 'bg-primary-600 hover:bg-primary-500 text-white focus-visible:ring-primary-400'
                  : tone === 'danger'
                    ? 'bg-rose-100/80 text-rose-600 hover:bg-rose-200/80 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60 focus-visible:ring-rose-300'
                    : tone === 'muted'
                      ? 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-600/70 focus-visible:ring-slate-400'
                      : 'bg-slate-100/70 text-slate-800 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700/70 focus-visible:ring-slate-500'
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
        aria-label={isOpen ? 'Cerrar calculadora' : 'Abrir calculadora'}
      >
        {isOpen ? <X size={24} /> : <Calculator size={24} />}
      </button>
    </div>
  );
};

export default FloatingCalculator;
