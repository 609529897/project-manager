import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /** 主进程构建配置 - Node.js 环境 */
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  /** preload 脚本构建配置 - Node.js 环境，contextBridge 隔离 */
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  /** 渲染进程构建配置 - 浏览器环境，React + Vite */
  renderer: {
    plugins: [react()]
  }
})
