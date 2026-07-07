import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ElectronAPI, LogEntry, ProcessStatus } from '../shared/types'

// 在 document 层阻止默认拖拽行为（防止浏览器处理文件拖拽导致导航）
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

/**
 * preload 脚本 - 安全暴露主进程 API 到渲染进程
 * 使用 contextBridge 实现上下文隔离，确保渲染进程无法直接访问 Node.js API
 */
const api: ElectronAPI = {
  /* ===== 项目管理 ===== */
  getProjects: () => ipcRenderer.invoke('project:list'),
  addProject: (folderPath) => ipcRenderer.invoke('project:add', folderPath),
  removeProject: (projectPath) => ipcRenderer.invoke('project:remove', projectPath),
  updateProject: (projectPath, config) => ipcRenderer.invoke('project:update', projectPath, config),

  /* ===== 进程管理 ===== */
  startProject: (projectPath) => ipcRenderer.invoke('project:start', projectPath),
  stopProject: (projectPath) => ipcRenderer.invoke('project:stop', projectPath),
  getAllStatuses: () => ipcRenderer.invoke('project:all-statuses'),

  /* ===== 日志监听 ===== */
  onProjectLog: (callback: (log: LogEntry) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, log: LogEntry): void => callback(log)
    ipcRenderer.on('project:log', handler)
    // 返回取消订阅函数
    return () => ipcRenderer.removeListener('project:log', handler)
  },

  onProcessStatusChange: (callback: (data: { projectPath: string; status: ProcessStatus }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { projectPath: string; status: ProcessStatus }
    ): void => callback(data)
    ipcRenderer.on('process:status-change', handler)
    return () => ipcRenderer.removeListener('process:status-change', handler)
  },

  /* ===== 主题 ===== */
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),

  /* ===== 文件路径解析（Electron webUtils） ===== */
  getPathForFile: (file: File) => Promise.resolve(webUtils.getPathForFile(file)),
  /* ===== 文件夹选择对话框 ===== */
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder')
}

// 通过 contextBridge 安全暴露 API 到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', api)
