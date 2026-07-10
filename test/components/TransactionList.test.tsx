import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionList from '../../components/TransactionList';
import { Transaction, TransactionType, Category } from '../../types';

const mockCategories: Category[] = [
  { id: 'c1', name: 'Comida', type: TransactionType.EXPENSE, color: '#ef4444', icon: '🍕' },
  { id: 'c2', name: 'Salario', type: TransactionType.INCOME, color: '#10b981', icon: '💰' },
];

const mockTransactions: Transaction[] = [
  { id: 't1', amount: 150, type: TransactionType.EXPENSE, date: '2026-07-15', categoryId: 'c1', accountId: 'a1', note: 'Almuerzo', isRecurring: false },
  { id: 't2', amount: 5000, type: TransactionType.INCOME, date: '2026-07-01', categoryId: 'c2', accountId: 'a1', note: 'Sueldo', isRecurring: true },
];

describe('TransactionList', () => {
  it('renders all transactions', () => {
    render(<TransactionList transactions={mockTransactions} categories={mockCategories} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Almuerzo')).toBeTruthy();
    expect(screen.getByText('Sueldo')).toBeTruthy();
  });

  it('shows category emoji for each transaction', () => {
    render(<TransactionList transactions={mockTransactions} categories={mockCategories} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('🍕')).toBeTruthy();
    expect(screen.getByText('💰')).toBeTruthy();
  });

  it('shows empty message when no transactions', () => {
    render(<TransactionList transactions={[]} categories={mockCategories} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/no hay movimientos/i)).toBeTruthy();
  });
});
