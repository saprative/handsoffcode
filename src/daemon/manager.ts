import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus } from '../types';
import { bus } from './bus';
import { createAdapter, AgentAdapter } from '../adapters';

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private adapters: Map<string, AgentAdapter> = new Map();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    bus.on('task:log', ({ taskId, log }) => {
      const task = this.tasks.get(taskId);
      if (task) {
        task.logs.push(log);
        task.updatedAt = new Date();
      }
    });

    bus.on('task:approval_required', ({ taskId, message }) => {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'approval_required';
        task.pendingMessage = message;
        task.updatedAt = new Date();
        bus.emit('task:status_changed', task);
      }
    });

    bus.on('task:completed', ({ taskId }) => {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'completed';
        task.updatedAt = new Date();
        task.pendingMessage = undefined;
        bus.emit('task:status_changed', task);
      }
    });

    bus.on('task:failed', ({ taskId, error }) => {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.logs.push(`[SYSTEM] Task failed: ${error}`);
        task.updatedAt = new Date();
        task.pendingMessage = undefined;
        bus.emit('task:status_changed', task);
      }
    });
  }

  async startTask(agent: string, input: string): Promise<Task> {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      agent,
      input,
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: []
    };

    this.tasks.set(taskId, task);

    try {
      const adapter = createAdapter(agent, bus);
      this.adapters.set(taskId, adapter);
      
      // Emit the status change after adapter creation is successful
      bus.emit('task:status_changed', task);
      
      // Start async without awaiting its complete finish
      adapter.startTask(taskId, input).catch(err => {
        bus.emit('task:failed', { taskId, error: err.message });
      });

    } catch (e: any) {
      task.status = 'failed';
      task.logs.push(`[SYSTEM] Failed to start agent: ${e.message}`);
      bus.emit('task:status_changed', task);
      throw e;
    }

    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async approveTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const adapter = this.adapters.get(taskId);
    if (!adapter) throw new Error('Adapter not running for task');

    await adapter.approve(taskId);
    task.status = 'running';
    task.pendingMessage = undefined;
    task.updatedAt = new Date();
    bus.emit('task:status_changed', task);
  }

  async rejectTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const adapter = this.adapters.get(taskId);
    if (!adapter) throw new Error('Adapter not running for task');

    await adapter.reject(taskId);
    task.status = 'running'; // Will transition to failed/completed shortly
    task.pendingMessage = undefined;
    task.updatedAt = new Date();
    bus.emit('task:status_changed', task);
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const adapter = this.adapters.get(taskId);
    if (!adapter) throw new Error('Adapter not running for task');

    await adapter.cancel(taskId);
    task.status = 'cancelled';
    task.pendingMessage = undefined;
    task.updatedAt = new Date();
    bus.emit('task:status_changed', task);
  }
}

export const manager = new TaskManager();
