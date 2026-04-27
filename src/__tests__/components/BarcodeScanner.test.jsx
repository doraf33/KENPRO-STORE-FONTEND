// Tests — composant BarcodeScanner
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarcodeScanner, BarcodeDisplay } from '../../BarcodeScanner';

// Mock @zxing/browser (caméra non disponible en jsdom)
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    listVideoInputDevices: vi.fn().mockResolvedValue([]),
    decodeFromVideoDevice: vi.fn().mockResolvedValue(null),
    reset: vi.fn(),
  })),
}));

describe('BarcodeScanner', () => {
  it('renders modal with title', () => {
    render(
      <BarcodeScanner
        onDetect={vi.fn()}
        onClose={vi.fn()}
        title="Test Scanner"
      />
    );
    expect(screen.getByText('Test Scanner')).toBeInTheDocument();
  });

  it('renders close button', () => {
    const onClose = vi.fn();
    render(<BarcodeScanner onDetect={vi.fn()} onClose={onClose} />);
    const closeBtn = screen.getByText('×');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows default title if not provided', () => {
    render(<BarcodeScanner onDetect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Scanner un code-barres')).toBeInTheDocument();
  });

  it('shows supported formats hint', () => {
    render(<BarcodeScanner onDetect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/EAN-13/i)).toBeInTheDocument();
  });
});

describe('BarcodeDisplay', () => {
  it('renders nothing when no value', () => {
    const { container } = render(<BarcodeDisplay value="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas when value is provided', () => {
    const { container } = render(<BarcodeDisplay value="1234567890123" />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
