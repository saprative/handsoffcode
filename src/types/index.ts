export type TaskStatus = 'idle' | 'running' | 'approval_required' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  agent: string;
  input: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  logs: string[];
  pendingMessage?: string; // e.g. "Deploy to production?"
}

export interface ConfigAgent {
  enabled: boolean;
}

export interface Config {
  telegram?: {
    bot_token: string;
    chat_id: string;
  };
  agents: {
    [key: string]: ConfigAgent;
  };
}
