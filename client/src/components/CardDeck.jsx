const CARDS = ['1', '2', '3', '5', '8', '13', '20', '?', 'пас']

export default function CardDeck({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 justify-items-center">
      {CARDS.map((value) => {
        const isSelected = selected === value
        const special = value === '?' || value === 'пас'
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`w-20 h-28 rounded-lg border font-semibold text-xl flex items-center
                        justify-center transition-all select-none shadow-soft
                        ${
                          isSelected
                            ? '-translate-y-2 bg-primary border-primary text-white shadow-card'
                            : special
                            ? 'bg-surface-card border-hairline text-muted hover:border-ink hover:-translate-y-1'
                            : 'bg-canvas border-hairline text-ink hover:border-ink hover:-translate-y-1'
                        }`}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}
