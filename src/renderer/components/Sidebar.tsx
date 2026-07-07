import { useState, useRef, useCallback, type DragEvent } from 'react'
import type { ProjectConfig, ProcessStatus } from '../../shared/types'
import ProjectItem from './ProjectItem'

interface SidebarProps {
  projects: ProjectConfig[]
  selectedPath: string | null
  statuses: Record<string, ProcessStatus>
  onSelect: (path: string) => void
  onAdd: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  onRemove: (path: string) => Promise<void>
  onStart: (path: string) => Promise<void>
  onStop: (path: string) => Promise<void>
}

export default function Sidebar({
  projects,
  selectedPath,
  statuses,
  onSelect,
  onAdd,
  onRemove,
  onStart,
  onStop
}: SidebarProps): JSX.Element {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      dragCounter.current = 0

      const files = e.dataTransfer.files
      if (files.length === 0) return

      // 通过 preload 的 webUtils.getPathForFile 获取真实路径
      // 比直接访问 file.path 更可靠（跨版本兼容）
      let folderPath = ''
      try {
        folderPath = await window.electronAPI.getPathForFile(files[0])
      } catch {
        // Fallback: 某些旧版 Electron 可能不支持 webUtils
        folderPath = (files[0] as unknown as { path?: string }).path ?? ''
      }

      if (!folderPath) {
        setError('无法获取文件路径，请尝试通过文件夹选择对话框添加')
        setTimeout(() => setError(null), 4000)
        return
      }

      const result = await onAdd(folderPath)
      if (!result.success) {
        setError(result.error ?? '添加失败')
        setTimeout(() => setError(null), 3000)
      }
    },
    [onAdd]
  )

  return (
    <aside
      className={`sidebar ${dragOver ? 'sidebar-drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="sidebar-header">
        <span className="sidebar-title">项目</span>
        <span className="sidebar-count">{projects.length}</span>
      </div>

      <div className="sidebar-list">
        {projects.map((project) => (
          <ProjectItem
            key={project.path}
            project={project}
            isSelected={selectedPath === project.path}
            status={statuses[project.path] ?? 'stopped'}
            onSelect={() => onSelect(project.path)}
            onRemove={() => onRemove(project.path)}
            onStart={() => onStart(project.path)}
            onStop={() => onStop(project.path)}
          />
        ))}
      </div>

      {/* 拖拽提示区域（点击也可弹出文件夹选择） */}
      <div
        className="sidebar-drop-zone"
        role="button"
        tabIndex={0}
        onClick={async () => {
          const folderPath = await window.electronAPI.selectFolder()
          if (folderPath) {
            const result = await onAdd(folderPath)
            if (!result.success) {
              setError(result.error ?? '添加失败')
              setTimeout(() => setError(null), 3000)
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.currentTarget.click()
          }
        }}
      >
        <span className="drop-zone-icon">+</span>
        <span className="drop-zone-text">点击或拖拽文件夹到此处添加</span>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="sidebar-error">
          {error}
        </div>
      )}
    </aside>
  )
}
