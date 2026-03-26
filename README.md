# WeChat Channel for Claude Code

通过微信直接与 Claude Code 对话。基于腾讯 iLink Bot API，注册为 Claude Code 插件。

Chat with Claude Code directly from WeChat — powered by Tencent's official iLink Bot API, packaged as a Claude Code plugin.

---

## 来源 / Origin

本插件融合了两个官方来源：

- **Claude Code Telegram 插件**（`plugin:telegram@claude-plugins-official`）— 提供了 MCP server 架构、channel 协议、访问控制、权限中继的设计思路
- **微信 ClawBot 插件**（`openclaw-weixin`）— 提供了 iLink Bot API 认证流程、CDN 媒体管线（AES-128-ECB）、语音转码方案

两个原插件均未被引入或修改。本项目是独立实现，将两者的设计模式融合为一个独立的微信 channel 插件。

This plugin was built by fusing two official sources:

- **Claude Code Telegram plugin** (`plugin:telegram@claude-plugins-official`) — provided the MCP server architecture, channel protocol, access control, and permission relay design
- **WeChat ClawBot plugin** (`openclaw-weixin`) — provided the iLink Bot API authentication flow, CDN media pipeline (AES-128-ECB), and voice transcode approach

Neither original plugin is included or modified. This project is an independent implementation combining their patterns into a single standalone WeChat channel.

---

## 中文

### 前置条件

- [Claude Code CLI](https://claude.ai/code) — 已安装并登录
- [Bun](https://bun.sh) — JavaScript 运行时（`curl -fsSL https://bun.sh/install | bash`）
- 微信账号，且已在微信 App 中开启 ClawBot 插件（见下方说明）

### 第一步：在微信 App 开启 ClawBot

> 首次使用必须先完成此步骤，才能运行 `bun setup.ts`。

1. 将微信更新到最新版本
2. 打开微信 → 点右下角 **我** → **设置** → **插件**
3. 在插件列表中找到 **微信ClawBot**，启用

完成后，接着执行下方的 **QR 码登录**。扫码成功后，微信消息首页会出现一个名为 **微信ClawBot** 的对话窗口，这就是你的 bot。

### 快速启动

```sh
claude --dangerously-load-development-channels plugin:wechat@claude-plugins-official
```

**必须用 `--dangerously-load-development-channels`，不能用 `--channels`。**
原因：wechat 不在 Claude Code 内置白名单上，`--channels` 会静默丢弃通知。

同时开 Telegram：
```sh
claude --channels plugin:telegram@claude-plugins-official \
       --dangerously-load-development-channels plugin:wechat@claude-plugins-official
```

### 首次设置

**1. QR 码登录**

```sh
cd /path/to/claude-channel-wechat
bun setup.ts
```

在浏览器打开输出的链接，用微信扫码确认。凭证保存到 `~/.claude/channels/wechat/account.json`。

**2. 启动 Claude Code**（上面的命令）

**3. 配对**

微信给 bot 发消息 -> 收到 6 位配对码 -> 在 Claude Code 终端输入：
```
/wechat:access pair <6位码>
```

完成。后续消息直达 Claude Code。

**4. 锁定（可选）**

配对完成后可切换到 allowlist 模式，不再给陌生人回配对码：
```
/wechat:access policy allowlist
```

### 插件注册链路

```
源码目录（本仓库）
  |
  |- symlink -> ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat
  |
  |- 安装缓存 -> ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
```

创建 symlink：
```sh
ln -sf /path/to/claude-channel-wechat \
  ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat
```

改代码改源码目录，cache 需手动同步：
```sh
cp server.ts setup.ts ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
```

### 状态文件

| 文件 | 位置 | 说明 |
|------|------|------|
| account.json | `~/.claude/channels/wechat/` | Bot 凭证（token, baseUrl, botId） |
| access.json | `~/.claude/channels/wechat/` | 访问控制（policy, allowFrom, pending） |
| sync.json | `~/.claude/channels/wechat/` | 长轮询断点续传 buffer |
| debug-mode.json | `~/.claude/channels/wechat/` | Debug 模式开关 |
| inbox/ | `~/.claude/channels/wechat/` | 下载的图片/媒体/语音 |

### settings.json 相关配置

- `enabledPlugins["wechat@claude-plugins-official"]: true`
- `disabledMcpjsonServers: ["wechat"]` — 防止项目 .mcp.json 重复加载

### 稳定性与自动恢复

| 场景 | 会断吗 | 自动恢复 | 说明 |
|------|--------|---------|------|
| Mac 睡眠（开了网络唤醒） | 不会 | - | Power Nap 保持网络 |
| iLink session timeout (-14) | 会 | 会（1h 后重试） | 服务器端 session 超时，自动恢复 |
| 网络短暂断开 | 会 | 会 | 重连后自动继续轮询 |
| bun 进程被杀 | 会 | 不会 | 需重新启动 Claude Code |
| 终端/tmux 关闭 | 会 | 不会 | 进程跟随终端退出 |
| Claude Code 更新插件市场 | 可能 | 不会 | symlink 可能被覆盖，见下方说明 |

### 官方市场更新风险

本插件通过 symlink 注入 `claude-plugins-official` 市场目录，不是官方维护的插件。当 Claude Code 从 GitHub 拉取官方市场更新时：

- `external_plugins/wechat` symlink 可能被删
- `marketplace.json` 里的 wechat 条目可能被覆盖

**恢复方法：**
```sh
# 重建 symlink
ln -sf /path/to/claude-channel-wechat \
  ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat

# 重新同步 cache
cp server.ts setup.ts package.json bun.lock .mcp.json \
  ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
cp -r .claude-plugin skills \
  ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/

# 如需重装 node_modules
cd ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/ && bun install
```

### 排查清单

| 症状 | 排查 |
|------|------|
| 发消息无反应 | 1. 是否用了 `--dangerously-load-development-channels`？（最常见） |
| | 2. `ps aux \| grep bun.*wechat` 确认进程在跑 |
| | 3. 检查 access.json 里 allowFrom 是否有你的 ID |
| errcode -14 | session timeout，自动恢复。如持续失败删 `sync.json` 重试 |
| 多进程抢消息 | `pkill -f "bun.*wechat"` 清理后重启 |
| 修改代码不生效 | 源码改了但 cache 没同步，手动 cp 或重装插件 |
| symlink 丢了 | 官方市场更新覆盖，用上面的恢复命令重建 |
| 需要重新登录 | `cd claude-channel-wechat && bun setup.ts` |
| 发送图片空白/灰色 | aes_key 编码问题，见下方"已知踩坑" |
| 权限回复卡住 | 必须回复 `y xxxxx`（带5位码），不能只发 `y` |

### 功能清单

| 功能 | 说明 |
|------|------|
| 文字收发 | Markdown→纯文本，4000字分片 |
| 图片收发 | 接收自动下载解密，发送AES加密上传CDN |
| 视频收发 | 同图片流程，MIME自动检测 |
| 文件收发 | PDF/DOC/ZIP等，保留原始文件名 |
| 语音接收 | SILK→WAV自动转码（silk-wasm可选依赖） |
| 打字指示器 | 收到消息后自动发typing |
| 访问控制 | 配对码/白名单/禁用三模式 |
| 权限交互 | Claude Code 权限请求通过微信确认 |
| Debug模式 | 微信发 `/toggle-debug` 开关，显示计时 |
| Echo测试 | 微信发 `/echo 文字` 回显 |
| 错误通知 | 媒体发送失败自动通知用户 |
| 断点续传 | sync.json 保存轮询位置 |
| 自动恢复 | session timeout 1h后自动重连 |

### MCP Tools

| 工具 | 参数 | 说明 |
|------|------|------|
| `reply` | `chat_id`, `text`(可选), `media_path`(可选) | 回复文字和/或媒体 |
| `download_attachment` | `encrypt_query_param`, `aes_key`, `ext` | 下载收到的附件 |
| `edit_message` | — | 不支持（占位符） |

### 技术要点

- **iLink Bot API** — single-consumer long-poll，同一 token 只能一个客户端 poll
- **Token 格式** — `botid@im.bot:hex`，API 直接返回完整格式，不需要拼接
- **必需 Headers** — `AuthorizationType: ilink_bot_token` + `X-WECHAT-UIN`（随机 base64）
- **凭证优先级** — 独立 account.json > openclaw-weixin fallback
- **媒体上传流程** — 读文件 → MD5 + AES-128 key → `getuploadurl` → AES-128-ECB 加密 → CDN POST → `x-encrypted-param` → `sendmessage` 带 media item
- **媒体下载流程** — CDN GET → AES-128-ECB 解密 → 保存到 inbox/
- **消息发送限制** — 文字+媒体分两次 sendmessage（item_list 一次一个 item）
- **SILK 语音** — silk-wasm 可选依赖，转码失败降级保存原始 .silk 文件

### 微信命令

微信里直接给 bot 发以下消息：

| 命令 | 说明 |
|------|------|
| `/toggle-debug` | 开关 Debug 模式，开启后消息元数据附带处理计时 |
| `/echo 文字` | 回声测试，bot 原样回复 |
| `y xxxxx` / `n xxxxx` | 回复权限请求（xxxxx 是5位码，必须带） |

### 微信里看不到的内容

Claude Code 的 channel 协议只有 3 种通知：
- `notifications/claude/channel` — 传入用户消息
- `notifications/claude/channel/permission_request` — 权限请求
- `notifications/claude/channel/permission` — 权限回复

**没有**中间状态通知（思考、读文件、搜索、工具执行）。这些只在终端里可见。

**替代方案：** 启动时终端显示的 `/remote-control` URL（`https://claude.ai/code/session_...`）可以在手机浏览器打开，实时看完整执行过程。

### 已知踩坑

**1. `--channels` vs `--dangerously-load-development-channels`**

`--channels` 会静默丢弃非白名单 channel 的通知。wechat 不在白名单上，必须用 `--dangerously-load-development-channels`。白名单硬编码在 Claude Code 二进制里（`getChannelAllowlist`），只有 telegram/discord/slack 等官方插件在上面。

**2. 媒体发送图片空白（已修复）**

*现象：* 图片发送成功（无报错），但微信里显示灰色空白，打不开。

*根因：* `aes_key` 编码方式错误。

```typescript
// 错误：base64(raw 16 bytes)
aes_key: Buffer.from(hexKey, 'hex').toString('base64')

// 正确：base64(hex string, 32 ASCII bytes)
aes_key: Buffer.from(hexKey).toString('base64')
```

微信客户端解 base64 后期望得到 32 字节的 hex 字符串再转成 16 字节密钥。如果给的是 16 字节原始数据，解密失败，图片空白。

**3. Token 格式不要二次拼接（已修复）**

iLink Bot API 的 `get_qrcode_status` 返回的 `bot_token` 已经是完整格式 `botid@im.bot:hex`，直接用。不要再拼 `ilink_bot_id + ':' + bot_token`，否则 token 格式错误导致所有 API 调用失败。

**4. 权限回复格式**

微信里回复权限请求时，必须带 5 位码：`y abcde`。只发 `y` 或 `yes` 不匹配正则，会被当成普通消息传给 Claude Code 而非权限回复。

### 维护参考

未来 ClawBot 发布更新时，媒体相关逻辑可参照其源码同步：
```
~/.openclaw/extensions/openclaw-weixin/src/
关键文件：cdn/upload.ts, cdn/cdn-upload.ts, messaging/send.ts, messaging/send-media.ts, api/api.ts
```

---

## English

### Prerequisites

- [Claude Code CLI](https://claude.ai/code) — installed and authenticated
- [Bun](https://bun.sh) — JavaScript runtime (`curl -fsSL https://bun.sh/install | bash`)
- A WeChat account with ClawBot plugin enabled (see step below)

### Step 1: Enable ClawBot in the WeChat App

> Complete this before running `bun setup.ts`.

1. Update WeChat to the latest version
2. Open WeChat → tap **Me** (bottom right) → **Settings** → **Plugins**
3. Find **微信ClawBot** in the plugin list and enable it

Then proceed to the **QR Login** step below. After scanning, a conversation named **微信ClawBot** will appear in your WeChat message list — that's your bot.

### Quick Start

```sh
claude --dangerously-load-development-channels plugin:wechat@claude-plugins-official
```

**Must use `--dangerously-load-development-channels`, not `--channels`.**
Reason: `wechat` is not on Claude Code's built-in channel allowlist. Using `--channels` silently drops all notifications from unlisted channels.

Run alongside Telegram:
```sh
claude --channels plugin:telegram@claude-plugins-official \
       --dangerously-load-development-channels plugin:wechat@claude-plugins-official
```

### First-time Setup

**1. QR Login**

```sh
cd /path/to/claude-channel-wechat
bun setup.ts
```

Open the printed URL in a browser and scan the QR code with WeChat. Credentials are saved to `~/.claude/channels/wechat/account.json`.

**2. Start Claude Code** (command above)

**3. Pair your WeChat account**

Send any message to the bot in WeChat → receive a 6-digit pairing code → in the Claude Code terminal:
```
/wechat:access pair <6-digit-code>
```

Done. Your WeChat messages now reach Claude Code directly.

**4. Lock down (optional)**

After pairing, switch to allowlist mode so strangers don't get a pairing prompt:
```
/wechat:access policy allowlist
```

### Plugin Registration

```
Source directory (this repo)
  |
  |- symlink -> ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat
  |
  |- install cache -> ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
```

Create the symlink:
```sh
ln -sf /path/to/claude-channel-wechat \
  ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat
```

After editing source files, sync the cache manually:
```sh
cp server.ts setup.ts ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
```

### State Files

| File | Location | Description |
|------|----------|-------------|
| account.json | `~/.claude/channels/wechat/` | Bot credentials (token, baseUrl, botId) |
| access.json | `~/.claude/channels/wechat/` | Access control (policy, allowFrom, pending) |
| sync.json | `~/.claude/channels/wechat/` | Long-poll resume buffer |
| debug-mode.json | `~/.claude/channels/wechat/` | Debug mode toggle |
| inbox/ | `~/.claude/channels/wechat/` | Downloaded images/media/audio |

### settings.json

- `enabledPlugins["wechat@claude-plugins-official"]: true`
- `disabledMcpjsonServers: ["wechat"]` — prevents `.mcp.json` from loading a duplicate MCP server

### Stability & Auto-Recovery

| Scenario | Disconnects | Auto-recovers | Notes |
|----------|-------------|---------------|-------|
| Mac sleep (with Power Nap) | No | — | Network stays active |
| iLink session timeout (-14) | Yes | Yes (after 1h) | Server-side session expiry |
| Brief network drop | Yes | Yes | Resumes polling on reconnect |
| bun process killed | Yes | No | Restart Claude Code |
| Terminal / tmux closed | Yes | No | Process exits with terminal |
| Official marketplace update | Maybe | No | Symlink may be overwritten |

### Official Marketplace Update Risk

This plugin is injected via symlink into the `claude-plugins-official` marketplace directory — it is not an officially maintained plugin. When Claude Code pulls marketplace updates from GitHub:

- The `external_plugins/wechat` symlink may be deleted
- The `wechat` entry in `marketplace.json` may be overwritten

**Recovery:**
```sh
# Rebuild symlink
ln -sf /path/to/claude-channel-wechat \
  ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/wechat

# Sync cache
cp server.ts setup.ts package.json bun.lock .mcp.json \
  ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/
cp -r .claude-plugin skills \
  ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/

# Reinstall dependencies if needed
cd ~/.claude/plugins/cache/claude-plugins-official/wechat/0.0.1/ && bun install
```

### Troubleshooting

| Symptom | Check |
|---------|-------|
| No response to messages | 1. Are you using `--dangerously-load-development-channels`? (most common) |
| | 2. `ps aux \| grep bun.*wechat` — confirm the process is running |
| | 3. Check `access.json` → `allowFrom` contains your WeChat ID |
| errcode -14 | Session timeout, auto-recovers. If persistent, delete `sync.json` and retry |
| Multiple processes fighting | `pkill -f "bun.*wechat"` then restart |
| Code changes not taking effect | Source edited but cache not synced — manually `cp` or reinstall |
| Symlink missing | Marketplace update overwrote it — use recovery commands above |
| Need to re-login | `cd claude-channel-wechat && bun setup.ts` |
| Images sent but appear blank/grey | `aes_key` encoding issue — see Known Issues below |
| Permission reply stuck | Must reply `y xxxxx` (with 5-char code) — `y` alone won't match |

### Features

| Feature | Description |
|---------|-------------|
| Text send/receive | Markdown → plain text, chunked at 4000 chars |
| Image send/receive | Receive: auto-download + AES decrypt. Send: AES encrypt + CDN upload |
| Video send/receive | Same pipeline as images, MIME auto-detected |
| File send/receive | PDF/DOC/ZIP etc., original filename preserved |
| Voice receive | SILK → WAV transcode (silk-wasm optional dep) |
| Typing indicator | Sent automatically on message receipt |
| Access control | Pairing code / allowlist / disabled modes |
| Permission relay | Claude Code permission requests confirmed via WeChat |
| Debug mode | Send `/toggle-debug` in WeChat, shows processing timings |
| Echo test | Send `/echo text` — bot echoes back |
| Error notification | Media send failures reported back to user |
| Resume on reconnect | sync.json saves poll position |
| Auto-recovery | Session timeout triggers 1h pause then reconnect |

### MCP Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `reply` | `chat_id`, `text` (optional), `media_path` (optional) | Send text and/or media |
| `download_attachment` | `encrypt_query_param`, `aes_key`, `ext` | Download a received attachment |
| `edit_message` | — | Not supported (placeholder) |

### Technical Notes

- **iLink Bot API** — single-consumer long-poll; only one client can poll per token
- **Token format** — `botid@im.bot:hex`; returned as-is from the API, no assembly needed
- **Required headers** — `AuthorizationType: ilink_bot_token` + `X-WECHAT-UIN` (random base64)
- **Credential priority** — standalone `account.json` > openclaw-weixin fallback
- **Media upload** — read file → MD5 + AES-128 key → `getuploadurl` → AES-128-ECB encrypt → CDN POST → `x-encrypted-param` → `sendmessage` with media item
- **Media download** — CDN GET → AES-128-ECB decrypt → save to `inbox/`
- **Send limit** — text and media must be sent as separate `sendmessage` calls (one item per `item_list`)
- **SILK audio** — silk-wasm optional dep; falls back to saving raw `.silk` on transcode failure

### WeChat Commands

Send these directly to the bot in WeChat:

| Command | Description |
|---------|-------------|
| `/toggle-debug` | Toggle debug mode — metadata + processing timings attached to messages |
| `/echo text` | Echo test — bot replies with the same text |
| `y xxxxx` / `n xxxxx` | Approve/deny a permission request (xxxxx = 5-char code, required) |

### What You Won't See in WeChat

The Claude Code channel protocol has only 3 notification types:
- `notifications/claude/channel` — incoming user message
- `notifications/claude/channel/permission_request` — permission request
- `notifications/claude/channel/permission` — permission reply

There is **no** intermediate-state notification (thinking, file reads, searches, tool calls). These are only visible in the terminal.

**Workaround:** The `/remote-control` URL printed at startup (`https://claude.ai/code/session_...`) can be opened on your phone's browser for a real-time view of the full execution.

### Known Issues

**1. `--channels` vs `--dangerously-load-development-channels`**

`--channels` silently drops notifications from channels not on the built-in allowlist. `wechat` is not on that list — you must use `--dangerously-load-development-channels`. The allowlist is hardcoded in the Claude Code binary (`getChannelAllowlist`); only `telegram`, `discord`, `slack`, and other official plugins are included.

**2. Images appear blank/grey (fixed)**

*Symptom:* Image sent successfully (no error), but displays as grey blank in WeChat.

*Root cause:* Wrong `aes_key` encoding.

```typescript
// Wrong: base64(raw 16 bytes)
aes_key: Buffer.from(hexKey, 'hex').toString('base64')

// Correct: base64(hex string, 32 ASCII bytes)
aes_key: Buffer.from(hexKey).toString('base64')
```

The WeChat client decodes base64 expecting a 32-byte hex string, then converts it to a 16-byte key. Passing 16 raw bytes breaks decryption.

**3. Token format double-assembly (fixed)**

The `bot_token` returned by `get_qrcode_status` is already `botid@im.bot:hex` — use it directly. Concatenating `ilink_bot_id + ':' + bot_token` produces a malformed token that breaks all API calls.

**4. Permission reply format**

Must include the 5-char code: `y abcde`. Sending just `y` or `yes` fails the regex and is forwarded to Claude Code as a regular message.

### Maintenance Reference

When ClawBot releases updates, sync media-related logic by referencing:
```
~/.openclaw/extensions/openclaw-weixin/src/
Key files: cdn/upload.ts, cdn/cdn-upload.ts, messaging/send.ts, messaging/send-media.ts, api/api.ts
```
