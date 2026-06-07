import { EventEmitter } from 'events';

class HandsOffCodeBus extends EventEmitter {}

export const bus = new HandsOffCodeBus();
