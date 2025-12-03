import { useCallback, useEffect, useRef } from 'react';
import { CloseButton } from '../ui/close-button';

/**
 * Props for LicenseDisclaimer component
 */
export interface LicenseDisclaimerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * License disclaimer modal component
 *
 * Displays GPL-3.0 license attribution, data accuracy disclaimers,
 * historical borders limitations, and disputed territories notice.
 * Supports keyboard accessibility with Escape to close and focus trapping.
 *
 * @example
 * ```tsx
 * <LicenseDisclaimer isOpen={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 */
export function LicenseDisclaimer({ isOpen, onClose }: LicenseDisclaimerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKeyPress);
    return () => {
      modal.removeEventListener('keydown', handleTabKeyPress);
    };
  }, [isOpen]);

  // Handle dialog click (close when clicking outside content)
  const handleDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Close only if clicking directly on the dialog wrapper (backdrop area)
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard events are handled by the document-level Escape key listener
    <div
      ref={modalRef}
      data-testid="license-disclaimer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-disclaimer-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleDialogClick}
    >
      {/* Backdrop - clicking closes modal */}
      <div
        data-testid="license-modal-backdrop"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        data-testid="license-modal-content"
        className="relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 id="license-disclaimer-title" className="text-xl font-semibold text-gray-900">
            ライセンス・免責事項
          </h2>
          <CloseButton ref={closeButtonRef} onClick={onClose} aria-label="閉じる" />
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* License Attribution Section */}
          <section>
            <h3 className="mb-3 text-lg font-medium text-gray-900">ライセンス情報</h3>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-sm text-gray-700">
                本アプリケーションで使用している地図データは{' '}
                <a
                  href="https://github.com/aourednik/historical-basemaps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  historical-basemaps
                </a>{' '}
                プロジェクトに基づいています。
              </p>
              <p className="text-sm text-gray-700">
                このデータは{' '}
                <span className="font-medium text-gray-900">
                  GNU General Public License v3.0 (GPL-3.0)
                </span>{' '}
                の下で提供されています。
              </p>
            </div>
          </section>

          {/* Data Accuracy Disclaimer */}
          <section data-testid="data-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-gray-900">データの正確性について</h3>
            <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    本アプリケーションは開発中のプロジェクトであり、表示されるデータは完全または正確でない可能性があります。歴史的な調査や学術的な目的には、複数の信頼できる情報源との照合をお勧めします。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Historical Borders Disclaimer */}
          <section data-testid="borders-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-gray-900">歴史的国境の概念的限界</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              現代の明確な国境線という概念は、近代国民国家の発展とともに生まれたものです。歴史上の多くの時代において、国境は流動的であり、現代のような明確な線として存在していませんでした。本アプリケーションで表示される境界線は、歴史的な支配領域を概念的に示すものであり、厳密な境界を表すものではありません。
            </p>
          </section>

          {/* Disputed Territories Disclaimer */}
          <section data-testid="disputed-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-gray-900">係争地域について</h3>
            <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                歴史上、多くの地域は複数の勢力によって領有権が主張されており、その帰属は時代や資料によって異なる解釈が存在します。本アプリケーションで表示される領土区分は、特定の政治的立場を支持するものではなく、歴史的な参考情報として提供されています。
              </p>
            </div>
          </section>

          {/* AI-Generated Content Notice */}
          <section>
            <h3 className="mb-3 text-lg font-medium text-gray-900">AI生成コンテンツについて</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              本アプリケーションの一部のテキスト説明はAIによって生成されています。これらの説明は参考情報として提供されており、正確性や完全性は保証されません。重要な情報については、信頼できる歴史的資料をご確認ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
