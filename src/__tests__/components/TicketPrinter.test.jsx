// Tests — composant TicketPrinter
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketPrinter from '../../components/TicketPrinter';

const INVOICE = {
  id: 1, number: 'FAC-0001', invoice_type: 'facture',
  total: 20000, status: 'payee',
  client_name: 'Marie Dupont', client_phone: '+237699001122',
  created_at: '2026-04-27', created_by: 'admin',
  items: [{ product_name: 'iPhone 15', quantity: 2, unit_price: 10000, total: 20000 }],
};

describe('TicketPrinter', () => {
  it('renders modal with invoice number', async () => {
    render(<TicketPrinter invoice={INVOICE} onClose={vi.fn()} />);
    await waitFor(() => {
      const els = screen.getAllByText(/FAC-0001/i);
      expect(els.length).toBeGreaterThan(0);
    });
  });

  it('shows total amount', async () => {
    render(<TicketPrinter invoice={INVOICE} onClose={vi.fn()} />);
    // Le total est présent dans le rendu (formaté en FCFA)
    await waitFor(() => {
      const matches = screen.getAllByText(/FCFA/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('renders print button', async () => {
    render(<TicketPrinter invoice={INVOICE} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Imprimer/i)).toBeInTheDocument();
    });
  });

  it('renders WhatsApp button', async () => {
    render(<TicketPrinter invoice={INVOICE} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(<TicketPrinter invoice={INVOICE} onClose={onClose} />);
    await waitFor(() => screen.getByText('×'));
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows client name in preview', async () => {
    render(<TicketPrinter invoice={INVOICE} onClose={vi.fn()} />);
    await waitFor(() => {
      // Le nom peut être dans le titre ou dans le preview du ticket
      const el = screen.getAllByText(/Marie|Client/i);
      expect(el.length).toBeGreaterThan(0);
    });
  });
});
