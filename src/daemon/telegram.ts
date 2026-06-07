import { Telegraf, Markup } from 'telegraf';
import { Config, Task } from '../types';
import { bus } from './bus';
import { manager } from './manager';

export class TelegramBot {
  private bot: Telegraf;
  private chatId: string;
  private liveLogMessages: Map<string, { messageId: number; lastText: string }> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Config) {
    if (!config.telegram?.bot_token || !config.telegram.chat_id) {
      throw new Error('Telegram configuration missing');
    }
    this.bot = new Telegraf(config.telegram.bot_token);
    this.chatId = config.telegram.chat_id;
    this.setupBot();
    this.setupBusListeners();
  }

  private setupBot() {
    this.bot.command('start', (ctx) => {
      ctx.reply('HandsOffCode Bot Started. Use /help to see available commands.');
    });

    this.bot.command('help', (ctx) => {
      ctx.reply(`HandsOffCode Commands:
/status - View agent status
/tasks - List recent tasks
/logs [taskId] - View logs
/approve [taskId] - Approve a task
/reject [taskId] - Reject a task
/cancel [taskId] - Cancel a task`);
    });

    this.bot.command('status', (ctx) => {
      const tasks = manager.getAllTasks();
      const active = tasks.filter(t => t.status === 'running' || t.status === 'approval_required');
      if (active.length === 0) {
        ctx.reply('All agents are idle.');
      } else {
        const lines = active.map(t => `${t.agent}: ${t.status} (${t.id})`);
        ctx.reply(`Active Agents:\n${lines.join('\n')}`);
      }
    });

    this.bot.command('tasks', (ctx) => {
      const tasks = manager.getAllTasks().slice(0, 5); // last 5
      if (tasks.length === 0) {
        ctx.reply('No tasks found.');
        return;
      }
      const lines = tasks.map(t => `- ${t.id.slice(0,8)} | ${t.agent} | ${t.status}`);
      ctx.reply(`Recent tasks:\n${lines.join('\n')}`);
    });

    // Callback queries for inline buttons
    this.bot.on('callback_query', async (ctx) => {
      // @ts-ignore
      const data = ctx.callbackQuery.data;
      if (!data) return;

      const [action, taskId] = data.split('_');
      try {
        if (action === 'approve') {
          await manager.approveTask(taskId);
          ctx.answerCbQuery('Task approved');
          ctx.editMessageText(`✅ Approved task ${taskId.slice(0,8)}`);
        } else if (action === 'reject') {
          await manager.rejectTask(taskId);
          ctx.answerCbQuery('Task rejected');
          ctx.editMessageText(`❌ Rejected task ${taskId.slice(0,8)}`);
        }
      } catch (err: any) {
        ctx.answerCbQuery(`Error: ${err.message}`);
      }
    });
  }

  private setupBusListeners() {
    bus.on('task:status_changed', async (task: Task) => {
      if (task.status === 'running' && task.logs.length === 0) {
        // Just started
        const msg = await this.bot.telegram.sendMessage(
          this.chatId,
          `🚀 Task started: ${task.agent}\nInput: ${task.input}\nID: ${task.id}`
        );
        this.startLogStreaming(task.id, msg.message_id);
      } else if (task.status === 'approval_required') {
        this.bot.telegram.sendMessage(
          this.chatId,
          `⚠ Approval Required for ${task.agent}\n\n${task.pendingMessage}\nTask ID: ${task.id}`,
          Markup.inlineKeyboard([
            Markup.button.callback('Approve', `approve_${task.id}`),
            Markup.button.callback('Reject', `reject_${task.id}`)
          ])
        );
      } else if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        this.stopLogStreaming(task.id);
        const icon = task.status === 'completed' ? '✅' : '❌';
        this.bot.telegram.sendMessage(this.chatId, `${icon} Task ${task.status}: ${task.agent} (${task.id})`);
      }
    });
  }

  private startLogStreaming(taskId: string, messageId: number) {
    // To avoid rate limits, we buffer logs and update every 2 seconds
    const interval = setInterval(async () => {
      const task = manager.getTask(taskId);
      if (!task) return;

      // get last 15 lines
      const recentLogs = task.logs.slice(-15).join('\n');
      if (!recentLogs.trim()) return;
      
      const newText = `📝 Logs for ${taskId.slice(0,8)}:\n\`\`\`\n${recentLogs}\n\`\`\``;
      const state = this.liveLogMessages.get(taskId);

      if (!state || state.lastText !== newText) {
        try {
          await this.bot.telegram.editMessageText(this.chatId, messageId, undefined, newText, { parse_mode: 'Markdown' });
          this.liveLogMessages.set(taskId, { messageId, lastText: newText });
        } catch (e) {
          // ignore rate limit or message not modified errors
        }
      }
    }, 2000);

    this.updateIntervals.set(taskId, interval);
  }

  private stopLogStreaming(taskId: string) {
    const interval = this.updateIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(taskId);
    }
  }

  public launch() {
    this.bot.launch();
    console.log('Telegram bot started.');
  }

  public stop() {
    this.bot.stop();
  }
}
