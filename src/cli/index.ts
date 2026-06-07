import { Command } from 'commander';
import { initConfig } from '../config';
import { startDaemon } from '../daemon/server';
import http from 'http';

const DAEMON_URL = `http://localhost:${process.env.HANDSOFFCODE_PORT || 9876}`;

async function request(path: string, method = 'GET', body?: any): Promise<any> {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(`${DAEMON_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          try {
            reject(new Error(JSON.parse(data).error || data));
          } catch {
            reject(new Error(data));
          }
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });

    req.on('error', (err: any) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('HandsOffCode daemon is not running. Please start it using "handsoffcode start".'));
      } else {
        reject(err);
      }
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export function setupCLI() {
  const program = new Command();

  program
    .name('handsoffcode')
    .description('Command and control layer for AI coding agents')
    .version('1.0.0');

  program.command('init')
    .description('Initialize configuration in the current directory')
    .action(() => {
      try {
        initConfig();
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.command('start')
    .description('Start the HandsOffCode daemon')
    .action(() => {
      try {
        startDaemon();
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.command('run')
    .description('Run an agent task')
    .argument('<agent>', 'Agent name (e.g. antigravity)')
    .argument('[input...]', 'Task input / prompt')
    .action(async (agent, inputParts) => {
      const input = inputParts.join(' ');
      try {
        const { taskId } = await request('/tasks', 'POST', { agent, input });
        console.log(`Task started with ID: ${taskId}`);
        console.log(`Streaming logs...`);

        // Use http to stream SSE
        http.get(`${DAEMON_URL}/tasks/${taskId}/logs`, (res) => {
          res.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.log) {
                  console.log(data.log);
                } else if (data.status) {
                  if (data.status === 'approval_required') {
                    console.log(`\n[!] ACTION REQUIRED: ${data.message}`);
                    console.log(`[!] Approve via Telegram, or run: handsoffcode approve ${taskId}`);
                  } else {
                    console.log(`\n[Task Status Update: ${data.status}]`);
                  }
                }
              }
            }
          });
          res.on('end', () => {
            console.log(`Task execution finished.`);
          });
        }).on('error', (err) => {
          console.error(`Log stream error: ${err.message}`);
        });

      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.command('status')
    .description('Get the status of agents and tasks')
    .action(async () => {
      try {
        const status = await request('/status');
        console.log('--- HandsOffCode Status ---');
        console.log('Configured Agents:');
        for (const [name, conf] of Object.entries(status.agents)) {
          // @ts-ignore
          console.log(`  - ${name}: ${conf.enabled ? 'Enabled' : 'Disabled'}`);
        }
        console.log('\nRecent Tasks:');
        for (const t of status.tasks.slice(0, 5)) {
          console.log(`  - [${t.id.slice(0,8)}] ${t.agent}: ${t.status}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.command('approve')
    .description('Approve a pending task')
    .argument('<taskId>', 'Task ID')
    .action(async (taskId) => {
      try {
        await request(`/tasks/${taskId}/approve`, 'POST');
        console.log('Task approved successfully.');
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.command('reject')
    .description('Reject a pending task')
    .argument('<taskId>', 'Task ID')
    .action(async (taskId) => {
      try {
        await request(`/tasks/${taskId}/reject`, 'POST');
        console.log('Task rejected successfully.');
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  program.parse();
}
