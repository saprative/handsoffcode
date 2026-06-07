import { TaskStatus } from '../types';

export interface AgentAdapter {
  /**
   * Starts a task and returns a taskId.
   * If task execution involves spawning processes, it should track them.
   */
  startTask(taskId: string, input: string): Promise<void>;

  /**
   * Approves a pending approval for a given task.
   */
  approve(taskId: string): Promise<void>;

  /**
   * Rejects a pending approval for a given task.
   */
  reject(taskId: string): Promise<void>;

  /**
   * Cancels a running task.
   */
  cancel(taskId: string): Promise<void>;
}
