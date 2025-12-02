import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicenseDisclaimer } from '../../../src/components/legal/license-disclaimer';

describe('LicenseDisclaimer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const modal = screen.getByTestId('license-disclaimer-modal');
      expect(modal).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<LicenseDisclaimer {...defaultProps} isOpen={false} />);

      const modal = screen.queryByTestId('license-disclaimer-modal');
      expect(modal).not.toBeInTheDocument();
    });

    it('renders modal title', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent(/ライセンス|免責事項/);
    });

    it('renders close button', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('License Attribution', () => {
    it('displays GPL-3.0 license attribution', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      expect(screen.getByText(/GPL-3.0/)).toBeInTheDocument();
    });

    it('displays historical-basemaps attribution', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      expect(screen.getByText(/historical-basemaps/)).toBeInTheDocument();
    });

    it('displays link to original repository', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const link = screen.getByRole('link', { name: /historical-basemaps/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://github.com/aourednik/historical-basemaps');
    });
  });

  describe('Disclaimer Content', () => {
    it('displays data accuracy disclaimer section', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const dataDisclaimer = screen.getByTestId('data-disclaimer');
      expect(dataDisclaimer).toBeInTheDocument();
    });

    it('displays historical borders disclaimer section', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const bordersDisclaimer = screen.getByTestId('borders-disclaimer');
      expect(bordersDisclaimer).toBeInTheDocument();
    });

    it('displays disputed territories disclaimer section', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const disputedDisclaimer = screen.getByTestId('disputed-disclaimer');
      expect(disputedDisclaimer).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<LicenseDisclaimer isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<LicenseDisclaimer isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<LicenseDisclaimer isOpen={true} onClose={onClose} />);

      // Click on backdrop area
      const backdrop = screen.getByTestId('license-modal-backdrop');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<LicenseDisclaimer isOpen={true} onClose={onClose} />);

      const modalContent = screen.getByTestId('license-modal-content');
      fireEvent.click(modalContent);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const modal = screen.getByTestId('license-disclaimer-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    it('has aria-modal="true"', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const modal = screen.getByTestId('license-disclaimer-modal');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const modal = screen.getByTestId('license-disclaimer-modal');
      expect(modal).toHaveAttribute('aria-labelledby', 'license-disclaimer-title');

      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveAttribute('id', 'license-disclaimer-title');
    });

    it('close button has proper aria-label', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
      expect(closeButton).toHaveAttribute('aria-label', '閉じる');
    });
  });

  describe('Focus Management', () => {
    it('traps focus within modal when open', () => {
      render(<LicenseDisclaimer {...defaultProps} />);

      // Modal should have focus trap mechanism
      const modal = screen.getByTestId('license-disclaimer-modal');
      expect(modal).toBeInTheDocument();

      // First focusable element should be the close button
      const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
      expect(closeButton).toBeInTheDocument();
    });
  });
});
