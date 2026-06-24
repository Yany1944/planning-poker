export default function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 bg-canvas border border-hairline
                      rounded-xl shadow-card px-5 py-4 text-[16px] leading-tight text-ink
                      min-w-[260px] max-w-sm ${
                        t.leaving
                          ? 'animate-[toast-out_.3s_ease-in_forwards]'
                          : 'animate-[toast-in_.32s_cubic-bezier(0.34,1.56,0.64,1)]'
                      }`}
        >
          {t.icon && <span className="shrink-0">{t.icon}</span>}
          <span className="font-medium">{t.text}</span>
        </div>
      ))}
    </div>
  )
}
