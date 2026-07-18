import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../../components/Dashboard';
import { Transaction, TransactionType, Category } from '../../types';

const mockCategories: Category[] = [
  { id: 'c1', name: 'Comida', type: TransactionType.EXPENSE, color: '#ef4444', icon: '🍕' },
  { id: 'c2', name: 'Salario', type: TransactionType.INCOME, color: '#10b981', icon: '💰' },
];

const mockTransactions: Transaction[] = [
  { id: 't1', amount: 150, type: TransactionType.EXPENSE, date: '2026-07-15', categoryId: 'c1', accountId: 'a1', note: 'Almuerzo', isRecurring: false },
  { id: 't2', amount: 5000, type: TransactionType.INCOME, date: '2026-07-01', categoryId: 'c2', accountId: 'a1', note: 'Sueldo', isRecurring: false },
];

describe('Dashboard', () => {
  it('renders category names from transaction rows', () => {
    render(<Dashboard transactions={mockTransactions} categories={mockCategories} goals={[]} onViewGoals={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Comida')).toBeTruthy();
    expect(screen.getByText('Salario')).toBeTruthy();
  });

  it('shows summary cards: Balance, Ingresos, Gastos', () => {
    render(<Dashboard transactions={mockTransactions} categories={mockCategories} goals={[]} onViewGoals={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getAllByText(/Balance/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ingresos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gastos/).length).toBeGreaterThan(0);
  });

  it('shows empty state for sections when no transactions', () => {
    render(<Dashboard transactions={[]} categories={mockCategories} goals={[]} onViewGoals={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Sin movimientos recurrentes')).toBeTruthy();
    expect(screen.getByText('Sin movimientos variables')).toBeTruthy();
  });
});
