import { cn } from '@/lib/utils';

interface AiNoticeProps {
  className?: string;
}

export function AiNotice({ className }: AiNoticeProps) {
  return (
    <div
      data-testid="ai-notice"
      className={cn(
        'flex items-center gap-1.5 rounded-md bg-amber-900/30 px-3 py-2 text-xs text-amber-300',
        className,
      )}
      role="note"
      aria-label="AI生成コンテンツの注意"
    >
      <svg
        className="h-4 w-4 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span>
        この説明はAIによって自動生成されたものです。内容の正確性については、他の情報源との照合を推奨します。
      </span>
    </div>
  );
}
