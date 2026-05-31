import { useCallback, useEffect, useRef } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CloseButton } from '../close-button/close-button';

export interface LicenseDisclaimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const linkClass =
  'text-role-link hover:text-role-link-hover underline decoration-role-link/40 hover:decoration-role-link-hover underline-offset-2 transition-colors';

export function LicenseDisclaimer({ isOpen, onClose }: LicenseDisclaimerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useFocusTrap(isOpen, modalRef);

  const handleDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
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
      <div
        data-testid="license-modal-backdrop"
        className="absolute inset-0 bg-surface-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        data-testid="license-modal-content"
        className="relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-panel p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-7 flex items-start justify-between border-b border-surface-border pb-4">
          <h2 id="license-disclaimer-title" className="text-modal-title text-text-primary">
            このサイトについて
          </h2>
          <CloseButton ref={closeButtonRef} onClick={onClose} aria-label="閉じる" />
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="mb-3 text-section-heading text-text-primary">注意事項</h3>
            <p className="text-body-sm leading-relaxed text-text-secondary">
              本サイトの境界線・領土区分は、
              <a
                href="https://github.com/aourednik/historical-basemaps"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                historical-basemaps
              </a>{' '}
              プロジェクトのデータに基づいています。これらは歴史的な支配領域を概念的に示したものであり、厳密な国境や特定の政治的立場を表すものではありません。領有や帰属の解釈は時代・資料によって異なるため、学習・調査の際は複数の信頼できる資料とあわせてご参照ください。
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-section-heading text-text-primary">ライセンス</h3>
            <p className="text-body-sm leading-relaxed text-text-secondary">
              本サイトで使用している地図データは André Ourednik 氏による{' '}
              <a
                href="https://github.com/aourednik/historical-basemaps"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                historical-basemaps
              </a>{' '}
              プロジェクトに基づき、
              <strong className="font-medium text-text-primary">
                GNU General Public License v3.0 (GPL-3.0)
              </strong>
              のもとで提供されています。詳細は{' '}
              <a
                href="/LICENSE-data.txt"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                ライセンス全文
              </a>
              をご覧ください。
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-section-heading text-text-primary">ソースコード</h3>
            <p className="text-body-sm leading-relaxed text-text-secondary">
              本サイトのソースコードは{' '}
              <a
                href="https://github.com/akihiro-tj/world-history-map"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                GitHub
              </a>{' '}
              で公開しています。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
