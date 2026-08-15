from pathlib import Path

path = Path('src/pages/Landing.jsx')
text = path.read_text()
replacements = {
    'className="min-h-screen overflow-x-hidden pb-24 sm:pb-0"': 'className="landing-page min-h-screen overflow-x-hidden pb-24 sm:pb-0"',
    '#F6F8FC': 'var(--landing-page)',
    '#0A2342': 'var(--landing-ink)',
    '#E7EDF5': 'var(--landing-border)',
    '#5D6D84': 'var(--landing-muted)',
    '#2456A6': 'var(--landing-link)',
    '#D4AF37': 'var(--landing-gold)',
    '#FFF5D8': 'var(--landing-gold-soft)',
    '#967414': 'var(--landing-gold-ink)',
    '#D9E3EF': 'var(--landing-border-strong)',
    '#E2EAF3': 'var(--landing-border)',
    '#F4F7FB': 'var(--landing-surface-muted)',
    '#EEF3FA': 'var(--landing-surface-blue)',
    '#EEF6F1': 'var(--landing-surface-green)',
    '#2D8A5A': 'var(--landing-success)',
    '#8290A5': 'var(--landing-subtle)',
    '#B18A16': 'var(--landing-gold-strong)',
    '#6B7A99': 'var(--landing-muted)',
    '#DCE5F0': 'var(--landing-border-strong)',
    '#8391A7': 'var(--landing-subtle)',
    '#F1F5FA': 'var(--landing-surface-muted)',
    '#7890AA': 'var(--landing-subtle)',
    '#7B8AA0': 'var(--landing-subtle)',
    '#E5D394': 'var(--landing-border-gold)',
    '#FFF9E8': 'var(--landing-gold-wash)',
    '#F8FAFD': 'var(--landing-surface-soft)',
    "background: 'white'": "background: 'var(--landing-surface)'",
    'white 55%': 'var(--landing-surface) 55%',
}
for old, new in replacements.items():
    text = text.replace(old, new)
path.write_text(text)
