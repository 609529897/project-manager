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
        <span className="project-item-visual">
          <span className={`project-status-dot ${isRunning ? 'running' : ''}`} />
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
