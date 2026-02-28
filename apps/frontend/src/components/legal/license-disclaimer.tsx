import { useCallback, useEffect, useRef } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CloseButton } from '../ui/close-button';

export interface LicenseDisclaimerProps {
  isOpen: boolean;
  onClose: () => void;
}

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

      <div
        data-testid="license-modal-content"
        className="relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-700 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-600 pb-4">
          <h2 id="license-disclaimer-title" className="text-xl font-semibold text-white">
            ライセンス・免責事項
          </h2>
          <CloseButton ref={closeButtonRef} onClick={onClose} aria-label="閉じる" />
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-lg font-medium text-white">ライセンス情報</h3>
            <div className="rounded-lg bg-gray-600 p-4">
              <p className="mb-2 text-sm text-gray-200">
                本アプリケーションで使用している地図データは{' '}
                <a
                  href="https://github.com/aourednik/historical-basemaps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-400 hover:underline"
                >
                  historical-basemaps
                </a>{' '}
                プロジェクトに基づいています。
              </p>
              <p className="text-sm text-gray-200">
                このデータは{' '}
                <span className="font-medium text-white">
                  GNU General Public License v3.0 (GPL-3.0)
                </span>{' '}
                の下で提供されています。
              </p>
              <p className="mt-2 text-sm text-gray-200">
                <a
                  href="/LICENSE-data.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-400 hover:underline"
                >
                  ライセンス全文を見る
                </a>
              </p>
            </div>
          </section>

          <section data-testid="data-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-white">データの正確性について</h3>
            <div className="rounded-lg border-l-4 border-yellow-600 bg-yellow-900/30 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-500"
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
                  <p className="text-sm text-yellow-300">
                    本アプリケーションは開発中のプロジェクトであり、表示されるデータは完全または正確でない可能性があります。歴史的な調査や学術的な目的には、複数の信頼できる情報源との照合をお勧めします。
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section data-testid="borders-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-white">歴史的国境の概念的限界</h3>
            <p className="text-sm leading-relaxed text-gray-300">
              現代の明確な国境線という概念は、近代国民国家の発展とともに生まれたものです。歴史上の多くの時代において、国境は流動的であり、現代のような明確な線として存在していませんでした。本アプリケーションで表示される境界線は、歴史的な支配領域を概念的に示すものであり、厳密な境界を表すものではありません。
            </p>
          </section>

          <section data-testid="disputed-disclaimer">
            <h3 className="mb-3 text-lg font-medium text-white">係争地域について</h3>
            <div className="rounded-lg border-l-4 border-blue-600 bg-blue-900/30 p-4">
              <p className="text-sm text-blue-300">
                歴史上、多くの地域は複数の勢力によって領有権が主張されており、その帰属は時代や資料によって異なる解釈が存在します。本アプリケーションで表示される領土区分は、特定の政治的立場を支持するものではなく、歴史的な参考情報として提供されています。
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-medium text-white">AI生成コンテンツについて</h3>
            <p className="text-sm leading-relaxed text-gray-300">
              本アプリケーションの一部のテキスト説明はAIによって生成されています。これらの説明は参考情報として提供されており、正確性や完全性は保証されません。重要な情報については、信頼できる歴史的資料をご確認ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
