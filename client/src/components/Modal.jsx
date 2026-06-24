import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div className={`relative panel w-full ${maxWidth} max-h-[88vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline sticky top-0 bg-canvas rounded-t-lg">
          <h2 className="font-semibold text-ink">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-muted-soft hover:text-ink transition-colors" title="Закрыть">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
