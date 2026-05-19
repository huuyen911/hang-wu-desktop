// Đóng gói Windows một cách "tự lành":
//
//  1. electron-builder cần gói `winCodeSign` (chứa rcedit để nhúng icon +
//     signtool). Gói này có symlink macOS; giải nén trên Windows bằng tài
//     khoản thường sẽ lỗi "Cannot create symbolic link" → build chết.
//     Trên Windows ta KHÔNG cần thư mục `darwin/`, nên ở đây tự giải nén
//     winCodeSign vào đúng chỗ cache, loại trừ `darwin/` (hết symlink → OK).
//  2. App nội bộ không ký số → ép CSC_IDENTITY_AUTO_DISCOVERY=false để
//     electron-builder bỏ qua ký, không dò chứng chỉ trong máy.
//
// Idempotent: nếu cache đã sẵn sàng thì bỏ qua bước 1. Chạy được trên mọi
// máy Windows, không cần quyền admin / Developer Mode.
import { existsSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

const WCS_VERSION = 'winCodeSign-2.6.0'
const WCS_URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${WCS_VERSION}/${WCS_VERSION}.7z`

const isWin = process.platform === 'win32'

async function ensureWinCodeSign() {
  if (!isWin) return // chỉ cần trên Windows
  const cacheRoot = join(
    process.env.LOCALAPPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Local'),
    'electron-builder',
    'Cache',
    'winCodeSign',
  )
  const destDir = join(cacheRoot, WCS_VERSION)
  const signtool = join(destDir, 'windows-10', 'x64', 'signtool.exe')
  if (existsSync(signtool)) {
    console.log(`[package-win] winCodeSign cache đã sẵn sàng: ${destDir}`)
    return
  }

  await mkdir(cacheRoot, { recursive: true })

  // Tìm 1 file .7z đã tải sẵn trong cache; nếu không có thì tải về.
  let archive = readdirSync(cacheRoot)
    .filter((f) => f.toLowerCase().endsWith('.7z'))
    .map((f) => join(cacheRoot, f))[0]

  if (!archive) {
    archive = join(cacheRoot, `${WCS_VERSION}.7z`)
    console.log(`[package-win] tải winCodeSign → ${archive}`)
    const res = await fetch(WCS_URL)
    if (!res.ok) throw new Error(`Tải winCodeSign thất bại: HTTP ${res.status}`)
    await pipeline(res.body, createWriteStream(archive))
  }

  const sevenZip = join(
    process.cwd(),
    'node_modules',
    '7zip-bin',
    'win',
    'x64',
    '7za.exe',
  )
  console.log(`[package-win] giải nén winCodeSign (loại trừ darwin/) → ${destDir}`)
  const r = spawnSync(
    sevenZip,
    ['x', archive, `-o${destDir}`, '-xr!darwin', '-y'],
    { stdio: 'inherit' },
  )
  if (r.status !== 0 || !existsSync(signtool)) {
    throw new Error('Giải nén winCodeSign thất bại (không thấy signtool.exe)')
  }
  console.log('[package-win] winCodeSign cache đã tạo xong.')
}

async function main() {
  await ensureWinCodeSign()

  // Bỏ qua ký số (app nội bộ, không có chứng chỉ).
  const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
  const bin = isWin ? 'electron-builder.cmd' : 'electron-builder'
  const builder = join(process.cwd(), 'node_modules', '.bin', bin)
  console.log('[package-win] electron-builder --win')
  // shell:true để chạy được .cmd trên Windows; quote đường dẫn phòng có dấu cách.
  const r = spawnSync(`"${builder}" --win`, {
    stdio: 'inherit',
    env,
    shell: true,
  })
  process.exit(r.status ?? 1)
}

main().catch((e) => {
  console.error('[package-win]', e instanceof Error ? e.message : e)
  process.exit(1)
})
