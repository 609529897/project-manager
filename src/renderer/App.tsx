import { useState, useEffect, useCallback } from 'react'
import type { ProjectConfig, ProcessStatus, LogEntry } from '../shared/types'
import Sidebar from './components/Sidebar'
import LogPanel from './components/LogPanel'
import Toolbar from './components/Toolbar'
import './App.css'

export default function App(): JSX.Element {
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, ProcessStatus>>({})
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({})
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const selectedProject = projects.find((p) => p.path === selectedPath) ?? null

  /** 从持久化存储加载项目列表 */
  const loadProjects = useCallback(async () => {
    const list = await window.electronAPI.getProjects()
    setProjects(list)
    const s = await window.electronAPI.getAllStatuses()
    setStatuses(s)
  }, [])

  /** 加载主题 */
  const loadTheme = useCallback(async () => {
    const t = await window.electronAPI.getTheme()
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    loadProjects()
    loadTheme()
  }, [loadProjects, loadTheme])

  /** 监听来自主进程的日志推送 */
  useEffect(() => {
    const unsub = window.electronAPI.onProjectLog((log: LogEntry) => {
      setLogs((prev) => {
        const existing = prev[log.projectPath] ?? []
        // 每条项目保留最近 2000 行日志
        const updated = [...existing, log]
        if (updated.length > 2000) {
          return { ...prev, [log.projectPath]: updated.slice(-2000) }
        }
        return { ...prev, [log.projectPath]: updated }
      })
    })
    return unsub
  }, [])

  /** 监听进程状态变化 */
  useEffect(() => {
    const unsub = window.electronAPI.onProcessStatusChange((data) => {
      setStatuses((prev) => ({ ...prev, [data.projectPath]: data.status }))
    })
    return unsub
  }, [])

  /** 主题切换 */
  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    await window.electronAPI.setTheme(next)
  }, [theme])

  /** 添加项目 */
  const handleAddProject = useCallback(
    async (folderPath: string) => {
      const result = await window.electronAPI.addProject(folderPath)
      if (result.success) {
        await loadProjects()
      }
      return result
    },
    [loadProjects]
  )

  /** 删除项目 */
  const handleRemoveProject = useCallback(
    async (projectPath: string) => {
      await window.electronAPI.removeProject(projectPath)
      if (selectedPath === projectPath) {
        setSelectedPath(null)
      }
      await loadProjects()
    },
    [loadProjects, selectedPath]
  )

  /** 更新项目配置 */
  const handleUpdateProject = useCallback(
    async (projectPath: string, config: Partial<ProjectConfig>) => {
      await window.electronAPI.updateProject(projectPath, config)
      await loadProjects()
    },
    [loadProjects]
  )

  /** 启动项目 */
  const handleStart = useCallback(
    async (projectPath: string) => {
      setStatuses((prev) => ({ ...prev, [projectPath]: 'starting' }))
      await window.electronAPI.startProject(projectPath)
    },
    []
  )

  /** 停止项目 */
  const handleStop = useCallback(async (projectPath: string) => {
    await window.electronAPI.stopProject(projectPath)
  }, [])

  return (
    <div className="app">
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onClearAll={async () => {
          for (const p of projects) {
            await window.electronAPI.removeProject(p.path)
          }
          setSelectedPath(null)
          await loadProjects()
        }}
      />
      <div className="app-body">
        <Sidebar
          projects={projects}
          selectedPath={selectedPath}
          statuses={statuses}
          onSelect={setSelectedPath}
          onAdd={handleAddProject}
          onRemove={handleRemoveProject}
          onStart={handleStart}
          onStop={handleStop}
        />
        <main className="main-content">
          {selectedProject ? (
            <>
              <div className="project-detail-header">
                <div className="project-title-group">
                  <span
                    className={`status-dot ${statuses[selectedProject.path] === 'running' ? 'running' : ''}`}
                  />
                  <h2 className="project-title">{selectedProject.name}</h2>
                </div>
              </div>
              <div className="project-detail-body">
                <div className="command-section">
                  <label className="command-label">启动命令</label>
                  <div className="command-input-row">
                    <input
                      className="command-input"
                      value={selectedProject.command}
                      onChange={(e) =>
                        handleUpdateProject(selectedProject.path, { command: e.target.value })
                      }
                      placeholder="yarn run dev"
                      spellCheck={false}
                    />
                    <button
                      className={`btn-action ${statuses[selectedProject.path] === 'running' ? 'btn-stop' : 'btn-start'}`}
                      onClick={() => {
                        if (statuses[selectedProject.path] === 'running') {
                          handleStop(selectedProject.path)
                        } else {
                          handleStart(selectedProject.path)
                        }
                      }}
                    >
                      {statuses[selectedProject.path] === 'running' ? '停止' : '启动'}
                    </button>
                  </div>
                </div>
                <LogPanel logs={logs[selectedProject.path] ?? []} />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <p className="empty-text">从左侧添加项目文件夹</p>
              <p className="empty-hint">或将文件夹拖拽到窗口即可添加</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
