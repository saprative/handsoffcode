import { EventEmitter } from 'events';
import { AgentAdapter } from './base';
import { AntigravityAdapter } from './antigravity';

export { AgentAdapter };

export function createAdapter(agentName: string, bus: EventEmitter): AgentAdapter {
  if (agentName.toLowerCase() === 'antigravity') {
    return new AntigravityAdapter(bus);
  }
  throw new Error(`Agent adapter for '${agentName}' is not implemented yet.`);
}
