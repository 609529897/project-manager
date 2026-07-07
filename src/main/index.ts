import { app, BrowserWindow, Menu, nativeImage, screen, shell, Tray } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { processManager } from './processManager'
import { getResourcePath } from './resources'

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null
/** macOS 菜单栏托盘 */
let tray: Tray | null = null

function createWindow(): void {
  const appIcon = nativeImage.createFromPath(getResourcePath('icons', 'icon-1024.png'))

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 850,
    minHeight: 500,
    title: '开发码头',
    icon: appIcon,
    titleBarStyle: 'hiddenInset', // macOS 磨砂标题栏
    trafficLightPosition: { x: 12, y: 12 },
    vibrancy: 'underWindow', // macOS 磨砂材质
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false // 禁用 Node 集成，保证安全
    }
  })

  // 开发模式加载 vite dev server，生产模式加载本地文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 在外部浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}

/** 创建 macOS 菜单栏图标 */
function createTray(): void {
  if (process.platform !== 'darwin') return

  const scaleFactor = screen.getPrimaryDisplay().scaleFactor
  // 与 bilibili 一致：16×16 / 32×32 template，不使用 resize
  const iconFile = scaleFactor >= 2 ? 'trayTemplate@2x.png' : 'trayTemplate.png'
  const icon = nativeImage.createFromPath(getResourcePath('icons', iconFile))
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('开发码头')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: (): void => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: (): void => {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  // 为 macOS 设置应用模型
  electronApp.setAppUserModelId('com.project-manager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册所有 IPC 处理器
  registerIpcHandlers()

  createWindow()
  createTray()

  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(getResourcePath('icons', 'icon-1024.png'))
    app.dock?.setIcon(dockIcon)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出（macOS 除外的标准行为）
app.on('window-all-closed', () => {
  processManager.stopAll() // 确保退出时杀死所有子进程
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前的清理
app.on('before-quit', () => {
  processManager.stopAll()
})
