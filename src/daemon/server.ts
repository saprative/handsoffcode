import express from 'express';
import { loadConfig } from '../config';
import { manager } from './manager';
import { TelegramBot } from './telegram';
import { bus } from './bus';
import { Task } from '../types';

export function startDaemon() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  let bot: TelegramBot | null = null;
  if (config.telegram?.bot_token && config.telegram?.bot_token !== 'YOUR_BOT_TOKEN_HERE' && config.telegram?.chat_id) {
    try {
      bot = new TelegramBot(config);
      bot.launch();
    } catch (err: any) {
      console.error(`Failed to launch Telegram bot: ${err.message}`);
    }
  } else {
    console.warn(`Telegram bot not configured or using default dummy token. Notifications will be disabled.`);
  }

  app.post('/tasks', async (req, res) => {
    try {
      const { agent, input } = req.body;
      const task = await manager.startTask(agent, input);
      res.json({ taskId: task.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/tasks', (req, res) => {
    res.json(manager.getAllTasks());
  });

  app.get('/tasks/:taskId', (req, res) => {
    const task = manager.getTask(req.params.taskId);
    if (task) res.json(task);
    else res.status(404).json({ error: 'Task not found' });
  });

  app.get('/tasks/:taskId/logs', (req, res) => {
    const taskId = req.params.taskId;
    const task = manager.getTask(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send existing logs
    for (const log of task.logs) {
      res.write(`data: ${JSON.stringify({ log })}\n\n`);
    }

    // Subscribe to new logs
    const onLog = (data: { taskId: string, log: string }) => {
      if (data.taskId === taskId) {
        res.write(`data: ${JSON.stringify({ log: data.log })}\n\n`);
      }
    };
    
    const onStatus = (changedTask: Task) => {
      if (changedTask.id === taskId) {
        res.write(`data: ${JSON.stringify({ status: changedTask.status, message: changedTask.pendingMessage })}\n\n`);
        if (changedTask.status === 'completed' || changedTask.status === 'failed' || changedTask.status === 'cancelled') {
          res.end();
          cleanup();
        }
      }
    };

    bus.on('task:log', onLog);
    bus.on('task:status_changed', onStatus);

    req.on('close', () => {
      cleanup();
    });

    function cleanup() {
      bus.off('task:log', onLog);
      bus.off('task:status_changed', onStatus);
    }
  });

  app.post('/tasks/:taskId/approve', async (req, res) => {
    try {
      await manager.approveTask(req.params.taskId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/tasks/:taskId/reject', async (req, res) => {
    try {
      await manager.rejectTask(req.params.taskId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/tasks/:taskId/cancel', async (req, res) => {
    try {
      await manager.cancelTask(req.params.taskId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/status', (req, res) => {
    res.json({
      agents: config.agents,
      tasks: manager.getAllTasks()
    });
  });

  const PORT = process.env.HANDSOFFCODE_PORT || 9876;
  app.listen(PORT, () => {
    console.log(`HandsOffCode daemon listening on port ${PORT}`);
  });
}
