import { app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ProjectConfig, StoreData } from '../shared/types'

/**
 * 本地 JSON 持久化存储模块
 * 数据文件存储在系统用户数据目录下，确保重启后配置不丢失
 */
class Store {
  private data: StoreData
  private filePath: string

  constructor() {
    // 存储在 Electron 的用户数据目录中
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'projects-config.json')
    this.data = this.load()
  }

  /** 从磁盘加载数据，文件不存在则返回默认值 */
  private load(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        return JSON.parse(raw) as StoreData
      }
    } catch {
      console.warn('配置读取失败，使用默认值')
    }
    return { projects: [], theme: 'dark' }
  }

  /** 将当前数据持久化到磁盘 JSON 文件 */
  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('配置持久化失败:', err)
    }
  }

  /** 获取所有已保存的项目 */
  getProjects(): ProjectConfig[] {
    return [...this.data.projects]
  }

  /** 添加新项目，若路径已存在则跳过 */
  addProject(config: ProjectConfig): boolean {
    const exists = this.data.projects.some((p) => p.path === config.path)
    if (exists) return false
    this.data.projects.push(config)
    this.save()
    return true
  }

  /** 根据路径删除项目 */
  removeProject(projectPath: string): void {
    this.data.projects = this.data.projects.filter((p) => p.path !== projectPath)
    this.save()
  }

  /** 更新指定项目的配置（如修改启动命令） */
  updateProject(projectPath: string, partial: Partial<ProjectConfig>): void {
    const idx = this.data.projects.findIndex((p) => p.path === projectPath)
    if (idx !== -1) {
      this.data.projects[idx] = { ...this.data.projects[idx], ...partial }
      this.save()
    }
  }

  /** 获取当前主题 */
  getTheme(): 'dark' | 'light' {
    return this.data.theme
  }

  /** 设置主题 */
  setTheme(theme: 'dark' | 'light'): void {
    this.data.theme = theme
    this.save()
  }
}

export const store = new Store()
