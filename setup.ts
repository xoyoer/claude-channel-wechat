#!/usr/bin/env bun
/**
 * WeChat channel setup — standalone QR code login for Claude Code.
 *
 * Usage:
 *   bun setup.ts
 *
 * This creates independent credentials at ~/.claude/channels/wechat/account.json
 * (separate from openclaw-weixin).
 */

import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const BASE_URL = 'https://ilinkai.weixin.qq.com'
const STATE_DIR = join(homedir(), '.claude', 'channels', 'wechat')
const ACCOUNT_FILE = join(STATE_DIR, 'account.json')

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchQRCode(): Promise<{ qrcode: string; qrcodeUrl: string }> {
  const url = `${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=3`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`get_bot_qrcode failed: ${res.status}`)
  const data = await res.json() as { qrcode?: string; qrcode_img_content?: string }
  if (!data.qrcode) throw new Error('no qrcode in response')
  return { qrcode: data.qrcode, qrcodeUrl: data.qrcode_img_content ?? '' }
}

async function pollQRStatus(qrcode: string): Promise<{
  status: string
  bot_token?: string
  ilink_bot_id?: string
  ilink_user_id?: string
  baseurl?: string
}> {
  const url = `${BASE_URL}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`
  try {
    const res = await fetch(url, {
      headers: { 'iLink-App-ClientVersion': '1' },
      signal: AbortSignal.timeout(35_000),
    })
    if (!res.ok) return { status: 'wait' }
    return await res.json() as any
  } catch {
    return { status: 'wait' }
  }
}

function normalizeAccountId(raw: string): string {
  return raw.replace(/[@.]/g, '-')
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   WeChat Channel — Claude Code Setup     ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log()

  // Check existing credentials
  try {
    const existing = JSON.parse(readFileSync(ACCOUNT_FILE, 'utf8'))
    if (existing.token) {
      console.log(`已有登录凭证:`)
      console.log(`  Bot ID: ${existing.botId ?? '(unknown)'}`)
      console.log(`  User ID: ${existing.userId ?? '(unknown)'}`)
      console.log(`  保存于: ${existing.savedAt ?? '(unknown)'}`)
      console.log()
      console.log('重新登录将覆盖现有凭证。')
      console.log('按 Enter 继续，或 Ctrl+C 取消...')
      for await (const line of console) { break }
    }
  } catch {}

  // Step 1: Get QR code
  console.log('正在获取二维码...')
  let { qrcode, qrcodeUrl } = await fetchQRCode()
  let refreshCount = 0
  const MAX_REFRESH = 3

  console.log()
  console.log('═══════════════════════════════════════════')
  console.log('  请用微信扫描以下二维码:')
  console.log()
  if (qrcodeUrl) {
    console.log(`  ${qrcodeUrl}`)
  }
  console.log()
  console.log('  (在浏览器中打开上面的链接，用微信扫码)')
  console.log('═══════════════════════════════════════════')
  console.log()

  // Step 2: Poll for status
  const startTime = Date.now()
  const OVERALL_TIMEOUT = 480_000 // 8 minutes
  let lastStatus = ''

  while (Date.now() - startTime < OVERALL_TIMEOUT) {
    const result = await pollQRStatus(qrcode)

    if (result.status !== lastStatus) {
      lastStatus = result.status
      switch (result.status) {
        case 'scaned':
          console.log('✓ 已扫码，请在手机上确认...')
          break
        case 'expired':
          if (refreshCount >= MAX_REFRESH) {
            console.error('✗ 二维码已过期且达到最大刷新次数，请重新运行 setup')
            process.exit(1)
          }
          refreshCount++
          console.log(`二维码已过期，正在刷新 (${refreshCount}/${MAX_REFRESH})...`)
          const refreshed = await fetchQRCode()
          qrcode = refreshed.qrcode
          qrcodeUrl = refreshed.qrcodeUrl
          console.log()
          if (qrcodeUrl) {
            console.log(`  新二维码: ${qrcodeUrl}`)
          }
          console.log()
          lastStatus = ''
          break
        case 'confirmed':
          // Success!
          if (!result.ilink_bot_id || !result.bot_token) {
            console.error('✗ 登录成功但缺少 token 或 bot_id')
            process.exit(1)
          }

          const botId = normalizeAccountId(result.ilink_bot_id)
          // API returns full token (e.g. "botid@im.bot:hex") — use as-is
          const token = result.bot_token.startsWith('Bearer ')
            ? result.bot_token.slice(7).trim()
            : result.bot_token

          const account = {
            token,
            baseUrl: result.baseurl ?? BASE_URL,
            userId: result.ilink_user_id ?? '',
            botId,
            savedAt: new Date().toISOString(),
          }

          // Save credentials
          mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
          writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2) + '\n', { mode: 0o600 })

          // Auto-add the scanning user to allowlist
          const accessFile = join(STATE_DIR, 'access.json')
          let access: any
          try {
            access = JSON.parse(readFileSync(accessFile, 'utf8'))
          } catch {
            access = { dmPolicy: 'pairing', allowFrom: [], pending: {} }
          }
          if (result.ilink_user_id && !access.allowFrom.includes(result.ilink_user_id)) {
            access.allowFrom.push(result.ilink_user_id)
          }
          writeFileSync(accessFile, JSON.stringify(access, null, 2) + '\n', { mode: 0o600 })

          console.log()
          console.log('╔══════════════════════════════════════════╗')
          console.log('║            ✓ 登录成功!                   ║')
          console.log('╚══════════════════════════════════════════╝')
          console.log()
          console.log(`  Bot ID:   ${botId}`)
          console.log(`  User ID:  ${result.ilink_user_id ?? '(unknown)'}`)
          console.log(`  凭证保存: ${ACCOUNT_FILE}`)
          console.log()
          console.log('启动 Claude Code:')
          console.log('  claude --dangerously-load-development-channels plugin:wechat@claude-plugins-official')
          console.log()
          process.exit(0)
          break
      }
    }

    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.error('✗ 登录超时（8分钟），请重新运行 setup')
  process.exit(1)
}

main().catch(err => {
  console.error('登录失败:', err.message ?? err)
  process.exit(1)
})
