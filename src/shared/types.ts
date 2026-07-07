/** 项目配置 - 存储用户添加的每个前端工程信息 */
export interface ProjectConfig {
  /** 项目文件夹绝对路径 */
  path: string
  /** 从路径中提取的目录名，用于展示 */
  name: string
  /** 用户自定义启动命令，默认 yarn run dev */
  command: string
}

/** 本地 JSON 持久化数据结构 */
export interface StoreData {
  /** 所有已添加项目的配置列表 */
  projects: ProjectConfig[]
  /** 当前主题 */
  theme: 'dark' | 'light'
}

/** 进程运行状态 */
export type ProcessStatus = 'running' | 'stopped' | 'starting'

/** 日志条目 */
export interface LogEntry {
  /** 项目路径（唯一标识） */
  projectPath: string
  /** 日志内容 */
  text: string
  /** 日志类型：普通输出 / 错误输出 */
  type: 'stdout' | 'stderr'
  /** 时间戳 */
  timestamp: number
}

/** 渲染进程通过 IPC 调用主进程的 API 接口定义 */
export interface ElectronAPI {
  /* -------- 项目管理 -------- */
  /** 获取所有项目列表 */
  getProjects: () => Promise<ProjectConfig[]>
  /** 添加项目（拖拽文件夹时调用） */
  addProject: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  /** 删除项目 */
  removeProject: (projectPath: string) => Promise<void>
  /** 更新项目配置（如修改启动命令） */
  updateProject: (projectPath: string, config: Partial<ProjectConfig>) => Promise<void>

  /* -------- 进程管理 -------- */
  /** 启动项目的开发命令 */
  startProject: (projectPath: string) => Promise<{ success: boolean; error?: string }>
  /** 停止项目的开发进程 */
  stopProject: (projectPath: string) => Promise<void>
  /** 获取所有进程状态 */
  getAllStatuses: () => Promise<Record<string, ProcessStatus>>

  /* -------- 日志 -------- */
  /** 监听项目日志的回调 */
  onProjectLog: (callback: (log: LogEntry) => void) => () => void
  /** 监听进程状态变化的回调 */
  onProcessStatusChange: (callback: (data: { projectPath: string; status: ProcessStatus }) => void) => () => void

  /* -------- 主题 -------- */
  /** 获取当前主题 */
  getTheme: () => Promise<'dark' | 'light'>
  /** 设置主题 */
  setTheme: (theme: 'dark' | 'light') => Promise<void>

  /* -------- 工具 -------- */
  /**
   * 从拖拽的 File 对象获取真实文件系统路径
   * 在 preload 层使用 Electron 的 webUtils.getPathForFile 解析
   * 比直接访问 file.path 更可靠
   */
  getPathForFile: (file: File) => Promise<string>
  /** 打开系统文件夹选择对话框，返回选中路径 */
  selectFolder: () => Promise<string | null>
}

/** 扩展 Window 接口，使 preload 暴露的 API 有类型提示 */
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
