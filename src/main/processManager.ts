import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { execSync } from 'node:child_process'
import { BrowserWindow } from 'electron'
import type { LogEntry, ProcessStatus } from '../shared/types'

/** 每个进程的跟踪记录 */
interface ProcessEntry {
  projectPath: string
  process: ChildProcess
  pid: number
  status: ProcessStatus
}

/**
 * 子进程管理器
 * 负责创建、跟踪、销毁每个项目对应的开发子进程
 * 每个进程完全独立，互不干扰
 */
class ProcessManager {
  /** key = 项目路径，value = 进程记录 */
  private processes = new Map<string, ProcessEntry>()
  /** 缓存用户 shell 的 PATH */
  private shellPath: string | null = null

  /** 获取用户 shell 的完整 PATH（登录 + 交互模式），并附常用 fallback 路径 */
  private getUserShellPath(): string {
    if (this.shellPath !== null) {
      return this.shellPath
    }

    if (process.platform === 'win32') {
      this.shellPath = process.env.PATH || ''
      return this.shellPath
    }

    const shell = process.env.SHELL || '/bin/zsh'
    const fallbackPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/opt/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
      `${process.env.HOME || ''}/.yarn/bin`,
      `${process.env.HOME || ''}/.local/bin`,
      `${process.env.HOME || ''}/.nvm/versions/node/default/bin`
    ].filter(Boolean)

    try {
      const path = execFileSync(
        shell,
        ['-i', '-l', '-c', 'printf "%s" "$PATH"'],
        { encoding: 'utf-8', timeout: 3000 }
      ).trim()
      this.shellPath = path ? `${path}:${fallbackPaths.join(':')}` : fallbackPaths.join(':')
    } catch (err) {
      console.warn('[ProcessManager] 获取 shell PATH 失败:', err)
      this.shellPath = fallbackPaths.join(':')
    }

    return this.shellPath
  }

  /**
   * 启动一个项目的开发命令
   * @param projectPath - 项目文件夹绝对路径（唯一标识）
   * @param command - 启动命令，如 "yarn run dev"
   * @param projectName - 项目名，仅用于日志标识
   */
  start(projectPath: string, command: string, projectName: string): boolean {
    if (this.processes.has(projectPath)) {
      const existing = this.processes.get(projectPath)!
      if (existing.status === 'running') {
        console.warn(`[ProcessManager] ${projectName} 已在运行中`)
        return false
      }
      // 清理僵尸进程记录
      this.processes.delete(projectPath)
    }

    console.log(`[ProcessManager] 启动 ${projectName}: ${command} (cwd: ${projectPath})`)

    const parts = command.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)

    const child = spawn(cmd, args, {
      cwd: projectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        PATH: this.getUserShellPath()
      }
    })

    const entry: ProcessEntry = {
      projectPath,
      process: child,
      pid: child.pid!,
      status: 'running'
    }
    this.processes.set(projectPath, entry)

    // 通知渲染进程状态变更
    this.broadcastStatus(projectPath, 'running')

    // 收集 stdout 输出，通过 IPC 发送给渲染进程
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8')
      this.broadcastLog(projectPath, lines, 'stdout')
    })

    // 收集 stderr 输出
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      this.broadcastLog(projectPath, text, 'stderr')
    })

    // 进程退出时清理记录
    child.on('exit', (code, signal) => {
      console.log(`[ProcessManager] ${projectName} 已退出 (code: ${code}, signal: ${signal})`)
      this.processes.delete(projectPath)
      this.broadcastStatus(projectPath, 'stopped')
    })

    child.on('error', (err) => {
      console.error(`[ProcessManager] ${projectName} 启动失败:`, err.message)
      this.broadcastLog(projectPath, `启动失败: ${err.message}\n`, 'stderr')
      this.processes.delete(projectPath)
      this.broadcastStatus(projectPath, 'stopped')
    })

    return true
  }

  /**
   * 停止指定项目的进程
   * 跨平台兼容：Windows 用 taskkill，Mac/Linux 用进程组信号
   */
  stop(projectPath: string): void {
    const entry = this.processes.get(projectPath)
    if (!entry) return

    const pid = entry.pid
    entry.status = 'stopped'

    try {
      this.killProcessTree(pid)
    } catch (err) {
      console.error(`[ProcessManager] 停止进程 ${pid} 失败:`, err)
    }

    // 如果进程还没退出，强制杀死
    try {
      if (entry.process.exitCode === null) {
        entry.process.kill('SIGKILL')
      }
    } catch {
      // ignore
    }

    this.processes.delete(projectPath)
    this.broadcastStatus(projectPath, 'stopped')
  }

  /** 停止所有正在运行的进程（窗口关闭时调用） */
  stopAll(): void {
    for (const [path] of this.processes) {
      this.stop(path)
    }
  }

  /** 获取指定项目的运行状态 */
  getStatus(projectPath: string): ProcessStatus {
    return this.processes.get(projectPath)?.status ?? 'stopped'
  }

  /** 获取所有项目的进程状态 */
  getAllStatuses(): Record<string, ProcessStatus> {
    const result: Record<string, ProcessStatus> = {}
    for (const [path, entry] of this.processes) {
      result[path] = entry.status
    }
    return result
  }

  /** 检查指定的项目路径是否正在运行 */
  isRunning(projectPath: string): boolean {
    return this.processes.has(projectPath) && this.processes.get(projectPath)!.status === 'running'
  }

  /**
   * 跨平台杀死进程树
   * - Windows: 使用 taskkill /T 递归终止子进程
   * - Mac/Linux: 使用负 PID 发送信号到整个进程组（需 detached 模式）
   */
  private killProcessTree(pid: number): void {
    if (process.platform === 'win32') {
      // Windows 下使用 taskkill 递归杀死进程树
      execSync(`taskkill /PID ${pid} /T /F`, {
        stdio: 'ignore',
        timeout: 5000
      })
    } else {
      try {
        // 向进程组发送 SIGTERM
        process.kill(-pid, 'SIGTERM')
      } catch {
        // 如果进程组不存在，尝试直接 kill
        try {
          process.kill(pid, 'SIGTERM')
        } catch {
          // 进程可能已经退出了
        }
      }
    }
  }

  /** 通过 IPC 向所有渲染窗口广播日志 */
  private broadcastLog(projectPath: string, text: string, type: 'stdout' | 'stderr'): void {
    const log: LogEntry = {
      projectPath,
      text,
      type,
      timestamp: Date.now()
    }
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('project:log', log)
      }
    })
  }

  /** 通过 IPC 向所有渲染窗口广播状态变化 */
  private broadcastStatus(projectPath: string, status: ProcessStatus): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('process:status-change', { projectPath, status })
      }
    })
  }
}

export const processManager = new ProcessManager()
