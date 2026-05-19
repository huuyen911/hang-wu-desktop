import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { runMigrations } from '../db/migrate'
import { closeDb, initDb } from '../db/connection'
import { handleApi } from '../api/router'
import { buildBackup, restoreBackup, summarize, validateBackup } from '../api/backup'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Icon cửa sổ/taskbar lúc chạy. Đóng gói: copy qua extraResources (xem
// electron-builder.yml). Dev: file gốc trong public/.
function iconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'clover.png')
    : join(app.getAppPath(), 'public/clover.png')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Hằng Wonder Union',
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Dev: electron-vite phục vụ renderer qua URL. Prod: file tĩnh trong out/.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Phải sau whenReady: dùng app.getPath('userData'). initDb (sql.js/WASM) là
  // async → await trước khi chạy migrations và mở kênh IPC.
  await initDb()
  runMigrations()

  // Kênh IPC duy nhất, ngữ nghĩa REST. Renderer gọi qua window.api.invoke.
  ipcMain.handle('api', (_e, payload: { method: string; path: string; body?: unknown }) =>
    handleApi(payload.method, payload.path, payload.body),
  )

  // Sao lưu toàn hệ thống: hỏi nơi lưu (Save As) rồi ghi 1 file JSON.
  ipcMain.handle('backup:export', async (e) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) return { ok: false, error: 'Không tìm thấy cửa sổ ứng dụng' }
      const file = buildBackup(app.getVersion())
      const ts = new Date()
        .toISOString()
        .slice(0, 16)
        .replace('T', '_')
        .replace(':', '')
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Lưu bản sao lưu hệ thống',
        defaultPath: `hang-wu-backup_${ts}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePath) return { ok: true, canceled: true }
      writeFileSync(filePath, JSON.stringify(file, null, 2), 'utf8')
      return { ok: true, canceled: false, filePath, summary: summarize(file) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' }
    }
  })

  // Phục hồi toàn hệ thống: chọn file, validate, xóa sạch & nạp lại (atomic).
  ipcMain.handle('backup:import', async (e) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) return { ok: false, error: 'Không tìm thấy cửa sổ ứng dụng' }
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Chọn file sao lưu để phục hồi',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || filePaths.length === 0) return { ok: true, canceled: true }

      let raw: unknown
      try {
        raw = JSON.parse(readFileSync(filePaths[0], 'utf8'))
      } catch {
        return { ok: false, error: 'File không hợp lệ (không phải JSON)' }
      }
      const summary = restoreBackup(validateBackup(raw))
      return { ok: true, canceled: false, summary }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', closeDb)
