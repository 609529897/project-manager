import { app } from 'electron'
import { join } from 'node:path'

/** 开发/打包环境下资源文件路径 */
export function getResourcePath(...segments: string[]): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, ...segments)
  }
  return join(__dirname, '../../resources', ...segments)
}
