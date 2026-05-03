---
name: configure
description: Check WeChat channel status and configuration. Use when the user wants to check channel health, view connected account, or troubleshoot.
user-invocable: true
allowed-tools:
  - Read
  - Bash(ls *)
---

# /wechat:configure — WeChat Channel Status

Check the connection status of the WeChat channel. Credentials live at
`~/.claude/channels/wechat/account.json` (created by `setup.ts`).

Arguments passed: `$ARGUMENTS`

---

## No args — status

1. **Account** — read `~/.claude/channels/wechat/account.json`:
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
   - No account → *"Login first: `cd claude-channel-wechat && bun setup.ts`"*
   - Account exists, nobody allowed → *"DM your WeChat bot. It replies with
     a pairing code. Approve with `/wechat:access pair <code>`."*
   - Account + allowed users → *"Ready. Messages reach Claude Code."*

---

## Implementation notes

- This is read-only. Token management is done via `setup.ts` (QR login).
- Access policy changes go through `/wechat:access`.
