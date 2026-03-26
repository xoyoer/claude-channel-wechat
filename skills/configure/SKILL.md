---
name: configure
description: Check WeChat channel status and configuration. Use when the user wants to check channel health, view connected account, or troubleshoot.
user-invocable: true
allowed-tools:
  - Read
  - Bash(ls *)
---

# /wechat:configure — WeChat Channel Status

The WeChat channel reuses credentials from openclaw-weixin. There is no
separate token to configure — just check the connection status.

Arguments passed: `$ARGUMENTS`

---

## No args — status

1. **Account** — check `~/.openclaw/openclaw-weixin/accounts.json` for
   registered account IDs. For each, read the account JSON file and show:
   - Account ID (masked)
   - Base URL
   - User ID
   - Token present: yes/no

2. **Access** — read `~/.claude/channels/wechat/access.json` (missing file
   = defaults). Show:
   - DM policy
   - Allowed senders count and list
   - Pending pairings if any

3. **Sync** — check `~/.claude/channels/wechat/sync.json` existence and
   whether a sync buf is saved.

4. **What next** — based on state:
   - No account → *"Login first: `openclaw channels login --channel openclaw-weixin`"*
   - Account exists, nobody allowed → *"DM your WeChat bot. It replies with
     a pairing code. Approve with `/wechat:access pair <code>`."*
   - Account + allowed users → *"Ready. Messages reach Claude Code."*

---

## Implementation notes

- This is read-only. Token management is done via openclaw CLI.
- Access policy changes go through `/wechat:access`.
