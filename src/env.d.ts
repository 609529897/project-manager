/// <reference types="vite/client" />

// 声明 preload 暴露的 electronAPI 类型
interface Window {
  electronAPI: import('./shared/types').ElectronAPI
}
