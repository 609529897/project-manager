import { ipcMain, dialog } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { store } from './store'
import { processManager } from './processManager'
import type { ProjectConfig } from '../shared/types'

/**
 * 注册所有 IPC 通信处理器
 * 渲染进程通过 preload 暴露的 API 调用这些处理器
 */
export function registerIpcHandlers(): void {
  /* ===== 项目管理 ===== */

  /** 获取所有项目列表 */
  ipcMain.handle('project:list', async () => {
    return store.getProjects()
  })

  /** 添加项目 - 拖拽文件夹时调用 */
  ipcMain.handle('project:add', async (_event, folderPath: string) => {
    // 校验路径合法性
    if (!folderPath || typeof folderPath !== 'string') {
      return { success: false, error: '无效的路径' }
    }

    // 检查路径是否存在且是目录
    let stat: fs.Stats
    try {
      stat = fs.statSync(folderPath)
    } catch {
      return { success: false, error: '路径不存在' }
    }

    if (!stat.isDirectory()) {
      return { success: false, error: '请选择文件夹，而非文件' }
    }

    const projectName = path.basename(folderPath)
    const config: ProjectConfig = {
      path: folderPath,
      name: projectName,
      command: 'yarn run dev'
    }

    const added = store.addProject(config)
    if (!added) {
      return { success: false, error: '该项目已存在列表中' }
    }
    return { success: true }
  })

  /** 删除项目 */
  ipcMain.handle('project:remove', async (_event, projectPath: string) => {
    // 如果项目正在运行，先停止
    if (processManager.isRunning(projectPath)) {
      processManager.stop(projectPath)
    }
    store.removeProject(projectPath)
  })

  /** 更新项目配置（如修改启动命令） */
  ipcMain.handle('project:update', async (_event, projectPath: string, config: Partial<ProjectConfig>) => {
    store.updateProject(projectPath, config)
  })

  /* ===== 进程管理 ===== */

  /** 启动项目的开发命令 */
  ipcMain.handle('project:start', async (_event, projectPath: string) => {
    const projects = store.getProjects()
    const project = projects.find((p) => p.path === projectPath)
    if (!project) {
      return { success: false, error: '项目未找到' }
    }

    // 检查是否已在运行
    if (processManager.isRunning(projectPath)) {
      return { success: false, error: '项目已在运行中' }
    }

    const started = processManager.start(projectPath, project.command, project.name)
    return started ? { success: true } : { success: false, error: '启动失败' }
  })

  /** 停止项目的开发进程 */
  ipcMain.handle('project:stop', async (_event, projectPath: string) => {
    processManager.stop(projectPath)
  })

  /** 获取所有进程状态 */
  ipcMain.handle('project:all-statuses', async () => {
    return processManager.getAllStatuses()
  })

  /* ===== 主题管理 ===== */

  /** 获取当前主题 */
  ipcMain.handle('theme:get', async () => {
    return store.getTheme()
  })

  /** 设置主题 */
  ipcMain.handle('theme:set', async (_event, theme: 'dark' | 'light') => {
    store.setTheme(theme)
  })

  /* ===== 文件对话框（备选添加方式） ===== */

  /** 打开文件夹选择对话框 */
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: '选择项目文件夹'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
