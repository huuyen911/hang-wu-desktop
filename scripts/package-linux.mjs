// Build Linux (AppImage + deb) — dùng trên Zorin OS / Ubuntu-based distros.
// Chạy: npm run build:linux
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

async function main() {
  const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
  const builder = join(process.cwd(), 'node_modules', '.bin', 'electron-builder')
  console.log('[package-linux] electron-builder --linux')
  const r = spawnSync(builder, ['--linux'], { stdio: 'inherit', env })
  process.exit(r.status ?? 1)
}

main().catch((e) => {
  console.error('[package-linux]', e instanceof Error ? e.message : e)
  process.exit(1)
})
