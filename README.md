# HandsOffCode

HandsOffCode is a command-and-control layer for AI coding agents.

Developers increasingly run agents such as Claude Code, Codex CLI, and Antigravity. These agents often execute long-running tasks, require approvals, generate logs, and create code changes. Traditionally, developers must stay attached to a terminal session to monitor and manage them.

HandsOffCode allows developers to launch and manage AI coding agents while receiving notifications and approvals remotely through Telegram. 

The goal is not to replace coding agents, but to provide a unified control plane above them.

## Features
- **Daemon Architecture:** Run tasks in the background without keeping your terminal session open.
- **Telegram Integration:** Receive real-time log streams and task status updates directly in your Telegram app.
- **Remote Approvals:** Approve or reject agent prompts dynamically using Telegram inline keyboards.
- **Live CLI Logging:** Stream agent logs directly to your terminal via Server-Sent Events.

## Installation

```bash
npm install -g handsoffcode
```

*(Note: Currently in Phase 1 development. You can also run it locally by cloning the repo, building with `npm run build`, and using `npm link`.)*

## Setup

Initialize your configuration file:
```bash
handsoffcode init
```

This will create a `handsoffcode.yaml` configuration file in your current directory. 
Edit this file to include your Telegram Bot Token and Chat ID:
```yaml
telegram:
  bot_token: "YOUR_BOT_TOKEN_HERE"
  chat_id: "YOUR_CHAT_ID_HERE"
agents:
  antigravity:
    enabled: true
  claude:
    enabled: true
  codex:
    enabled: true
```

## Usage

**1. Start the Daemon**
Start the background engine (which also connects your Telegram Bot):
```bash
handsoffcode start
```

**2. Run an Agent**
Execute a task with one of your enabled agents:
```bash
handsoffcode run antigravity "Build a new feature"
```

The CLI will stream logs live. Even if you close the terminal, the task will continue running in the background daemon.

**3. Remote Approvals**
When an agent encounters a step requiring user approval, it will pause and trigger a Telegram notification:
```
⚠ Approval Required for antigravity

Deploy to production?
Task ID: 5c754e13

[Approve] [Reject]
```
You can simply click the buttons in Telegram to resume or abort the task!

**4. View Status**
You can view the status of all active and recent tasks:
```bash
handsoffcode status
```
Or simply message your Telegram bot with `/status` or `/tasks`!

## Architecture

HandsOffCode consists of:
1. **Core CLI:** Handles standard terminal commands and configuration.
2. **Local IPC Daemon:** A background HTTP server that orchestrates agent runs and holds the event bus.
3. **Agent Adapters:** Interfaces to seamlessly communicate with underlying agent sub-processes.
4. **Telegram Adapter:** Connects the daemon event bus to Telegram for remote logging and approvals.

---

### Phase 1 Demo
Phase 1 includes the core architecture and a Mock Antigravity Agent to demonstrate the system end-to-end without requiring actual complex agent installations.
