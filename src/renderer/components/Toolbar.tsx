interface ToolbarProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onClearAll: () => void
}

function SunIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  )
}

function MoonIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
      <path d="M13 8.5A5.5 5.5 0 1 1 7.5 3a4.5 4.5 0 0 0 5.5 5.5z" />
    </svg>
  )
}

function TrashIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M5.5 4V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1M12.5 4v10a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4M6.5 7v4M9.5 7v4" />
    </svg>
  )
}

export default function Toolbar({ theme, onToggleTheme, onClearAll }: ToolbarProps): JSX.Element {
  return (
    <header className="toolbar">
      <div className="toolbar-right">
        <button className="btn-icon" onClick={onToggleTheme} title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="btn-icon" onClick={onClearAll} title="清空所有项目">
          <TrashIcon />
        </button>
      </div>
    </header>
  )
}
