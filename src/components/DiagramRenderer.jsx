export default function DiagramRenderer({ diagram }) {
  if (!diagram || diagram.type === 'none' || !diagram.items?.length) return null

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: '#FAFBFC', border: '1px solid #E2E8F0' }}>
      {diagram.title && (
        <p className="text-xs font-bold mb-4 tracking-wide" style={{ color: '#0A2342' }}>
          📊 {diagram.title.toUpperCase()}
        </p>
      )}

      {diagram.type === 'flow' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {diagram.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="rounded-xl px-4 py-3 text-center min-w-[110px]" style={{ background: '#0A2342' }}>
                <p className="text-white text-sm font-bold">{item.label}</p>
                {item.description && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.description}</p>
                )}
              </div>
              {i < diagram.items.length - 1 && (
                <span className="text-xl font-bold" style={{ color: '#D4AF37' }}>→</span>
              )}
            </div>
          ))}
        </div>
      )}

      {diagram.type === 'comparison' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diagram.items.map((item, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #E2E8F0' }}>
              <p className="text-sm font-bold mb-1" style={{ color: '#0A2342' }}>{item.label}</p>
              {item.description && (
                <p className="text-xs leading-relaxed" style={{ color: '#6B7A99' }}>{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
