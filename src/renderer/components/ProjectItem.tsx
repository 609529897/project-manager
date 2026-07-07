import type { ProjectConfig, ProcessStatus } from '../../shared/types'

interface ProjectItemProps {
  project: ProjectConfig
  isSelected: boolean
  status: ProcessStatus
  onSelect: () => void
  onRemove: () => void
  onStart: () => void
  onStop: () => void
}

function FolderIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M1.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export default function ProjectItem({
  project,
  isSelected,
  status,
  onSelect,
  onRemove,
  onStart,
  onStop
}: ProjectItemProps): JSX.Element {
  const isRunning = status === 'running'
  const isStarting = status === 'starting'

  return (
    <div
      className={`project-item ${isSelected ? 'project-item-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="project-item-main">
        <span className={`project-status-dot ${isRunning ? 'running' : ''}`} />
        <span className="project-item-icon">
          <FolderIcon />
        </span>
        <div className="project-item-info">
          <span className="project-item-name">{project.name}</span>
          <span className="project-item-path">{project.path}</span>
        </div>
        <button
          className="project-item-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="移除项目"
        >
          ×
        </button>
      </div>
      <div className="project-item-actions">
        {isRunning ? (
          <button
            className="project-btn project-btn-stop"
            onClick={(e) => {
              e.stopPropagation()
              onStop()
            }}
          >
            停止
          </button>
        ) : (
          <button
            className="project-btn project-btn-start"
            onClick={(e) => {
              e.stopPropagation()
              onStart()
            }}
            disabled={isStarting}
          >
            {isStarting ? '...' : '启动'}
          </button>
        )}
      </div>
    </div>
  )
}
