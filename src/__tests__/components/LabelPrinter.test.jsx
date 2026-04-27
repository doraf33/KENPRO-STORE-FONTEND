// Tests — composant LabelPrinter
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LabelPrinter from '../../components/LabelPrinter';

// Mock jsbarcode
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

const PRODUCT = {
  id: 1, name: 'iPhone 15', category: 'Smartphones',
  price: 450000, barcode: '1234567890123',
};

describe('LabelPrinter', () => {
  it('renders product name', async () => {
    render(<LabelPrinter product={PRODUCT} onClose={vi.fn()} />);
    await waitFor(() => {
      const els = screen.getAllByText('iPhone 15');
      expect(els.length).toBeGreaterThan(0);
    });
  });

  it('renders format buttons (58mm / 80mm)', async () => {
    render(<LabelPrinter product={PRODUCT} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('58mm')).toBeInTheDocument();
      expect(screen.getByText('80mm')).toBeInTheDocument();
    });
  });

  it('renders quantity controls', async () => {
    render(<LabelPrinter product={PRODUCT} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('−')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
    });
  });

  it('calls onClose when × clicked', async () => {
    const onClose = vi.fn();
    render(<LabelPrinter product={PRODUCT} onClose={onClose} />);
    await waitFor(() => screen.getByText('×'));
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('increments copy count', async () => {
    render(<LabelPrinter product={PRODUCT} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('+'));
    const plus = screen.getByText('+');
    fireEvent.click(plus);
    // Count display should be > 1 (initially 1, becomes 2)
    await waitFor(() => {
      const count = screen.getByText('2');
      expect(count).toBeInTheDocument();
    });
  });

  it('preset buttons exist', async () => {
    render(<LabelPrinter product={PRODUCT} onClose={vi.fn()} />);
    await waitFor(() => {
      // Les presets 5, 10, 20, 50 sont affichés comme boutons
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });
  });
});
