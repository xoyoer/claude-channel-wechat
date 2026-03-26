#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_JSON="$HOME/.mcp.json"

echo ""
echo "claude-channel-wechat 安装程序"
echo "================================"
echo ""

# ── 检查前置依赖 ──────────────────────────────────────────────

if ! command -v bun &>/dev/null; then
  echo "✗ 未找到 bun，请先安装："
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo ""
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "✗ 未找到 Claude Code CLI，请先安装："
  echo "  https://claude.ai/code"
  echo ""
  exit 1
fi

echo "✓ bun $(bun --version)"
echo "✓ claude $(claude --version 2>/dev/null | head -1 || echo '已安装')"
echo ""

# ── Step 1：安装依赖 ───────────────────────────────────────────

echo "步骤 1/3：安装依赖..."
cd "$REPO_DIR"
bun install --no-summary
echo "✓ 依赖安装完成"
echo ""

# ── Step 2：配置 ~/.mcp.json ──────────────────────────────────

echo "步骤 2/3：配置 ~/.mcp.json..."

bun -e "
const fs = require('fs');
const mcpPath = process.argv[1];
const repoDir = process.argv[2];

let config = {};
if (fs.existsSync(mcpPath)) {
  const raw = fs.readFileSync(mcpPath, 'utf8').trim();
  if (raw) {
    try {
      config = JSON.parse(raw);
    } catch (e) {
      console.error('✗ ' + mcpPath + ' JSON 格式错误，请手动检查后重试');
      process.exit(1);
    }
  }
}

config.mcpServers = config.mcpServers || {};

if (config.mcpServers.wechat) {
  console.log('  (已存在 wechat 条目，更新路径)');
}

config.mcpServers.wechat = {
  command: 'bun',
  args: ['run', '--cwd', repoDir, '--shell=bun', '--silent', 'start']
};

fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n');
" "$MCP_JSON" "$REPO_DIR"

echo "✓ 已写入 $MCP_JSON"
echo ""

# ── Step 3：微信扫码登录 ───────────────────────────────────────

echo "步骤 3/3：微信扫码登录..."
echo ""
echo "  即将打开二维码链接，请用微信扫码完成授权。"
echo "  凭证将保存到 ~/.claude/channels/wechat/account.json"
echo ""
bun "$REPO_DIR/setup.ts"
echo ""

# ── 完成提示 ──────────────────────────────────────────────────

echo "================================"
echo "✓ 安装完成！"
echo ""
echo "启动微信 channel："
echo ""
echo "  claude --dangerously-load-development-channels server:wechat"
echo ""
echo "同时开 Telegram（需已配置 Telegram 插件）："
echo ""
echo "  claude --channels plugin:telegram@claude-plugins-official --dangerously-load-development-channels server:wechat"
echo ""
echo "配对步骤："
echo "  1. 用微信给 bot 发任意消息"
echo "  2. 收到 6 位配对码"
echo "  3. 在 Claude Code 终端输入：/wechat:access pair <配对码>"
echo ""
