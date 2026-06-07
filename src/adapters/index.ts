import { EventEmitter } from 'events';
import { AgentAdapter } from './base';
import { CliAgentAdapter } from './cli-agent';

export { AgentAdapter };

export function createAdapter(agentName: string, bus: EventEmitter): AgentAdapter {
  const supportedAgents: Record<string, string> = {
    'antigravity': 'antigravity',
    'claude': 'claude',
    'codex': 'codex'
  };

  const command = supportedAgents[agentName.toLowerCase()];
  if (command) {
    return new CliAgentAdapter(command, bus);
  }
  
  throw new Error(`Agent adapter for '${agentName}' is not implemented yet.`);
}
