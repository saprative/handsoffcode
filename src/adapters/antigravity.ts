import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { AgentAdapter } from './base';

export class AntigravityAdapter implements AgentAdapter {
  private processes: Map<string, ChildProcess> = new Map();

  constructor(private bus: EventEmitter) {}

  async startTask(taskId: string, input: string): Promise<void> {
    // Launch the mock agent
    const mockAgentPath = path.join(__dirname, '..', 'mock', 'antigravity-agent.ts');
    
    // We use tsx or ts-node to run the typescript mock agent directly
    // In production, this would call the actual 'antigravity' binary.
    const child = spawn('npx', ['tsx', mockAgentPath, input], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.processes.set(taskId, child);

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            if (parsed.event === 'approval_required') {
              this.bus.emit('task:approval_required', {
                taskId,
                message: parsed.message
              });
              continue;
            }
          } catch (e) {
            // Not JSON, just a regular log
          }

          this.bus.emit('task:log', { taskId, log: line });
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim() !== '');
        for (const line of lines) {
          this.bus.emit('task:log', { taskId, log: `[ERROR] ${line}` });
        }
      });
    }

    child.on('close', (code) => {
      this.processes.delete(taskId);
      if (code === 0) {
        this.bus.emit('task:completed', { taskId });
      } else {
        this.bus.emit('task:failed', { taskId, error: `Process exited with code ${code}` });
      }
    });

    child.on('error', (err) => {
      this.processes.delete(taskId);
      this.bus.emit('task:failed', { taskId, error: err.message });
    });
  }

  async approve(taskId: string): Promise<void> {
    const child = this.processes.get(taskId);
    if (!child) throw new Error(`Task ${taskId} not found or not running`);
    if (child.stdin) {
      child.stdin.write('approve\n');
    }
  }

  async reject(taskId: string): Promise<void> {
    const child = this.processes.get(taskId);
    if (!child) throw new Error(`Task ${taskId} not found or not running`);
    if (child.stdin) {
      child.stdin.write('reject\n');
    }
  }

  async cancel(taskId: string): Promise<void> {
    const child = this.processes.get(taskId);
    if (child) {
      child.kill('SIGTERM');
      this.processes.delete(taskId);
    }
  }
}
