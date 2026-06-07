import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import readline from 'readline';
import { Config } from '../types';

const CONFIG_FILENAME = 'handsoffcode.yaml';

export function getConfigPath(): string {
  // Local first configuration: check current directory
  const localPath = path.join(process.cwd(), CONFIG_FILENAME);
  return localPath;
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration not found at ${configPath}. Run 'handsoffcode init' to create one.`);
  }

  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.parse(fileContents) as Config;
}

export async function initConfig(): Promise<void> {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    throw new Error(`Configuration already exists at ${configPath}`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

  console.log('Welcome to HandsOffCode CLI setup!\n');
  const bot_token = await question('Enter your Telegram Bot Token (leave blank to skip for now): ');
  const chat_id = await question('Enter your Telegram Chat ID (leave blank to skip for now): ');
  
  console.log("\\nLet's enable some agents. (y/n)");
  const enableAntigravity = await question('Enable Antigravity? [Y/n]: ');
  const enableClaude = await question('Enable Claude Code? [Y/n]: ');
  const enableCodex = await question('Enable Codex? [Y/n]: ');

  rl.close();

  const defaultConfig: Config = {
    telegram: {
      bot_token: bot_token.trim() || 'YOUR_BOT_TOKEN_HERE',
      chat_id: chat_id.trim() || 'YOUR_CHAT_ID_HERE',
    },
    agents: {
      antigravity: {
        enabled: enableAntigravity.trim().toLowerCase() !== 'n',
      },
      claude: {
        enabled: enableClaude.trim().toLowerCase() !== 'n',
      },
      codex: {
        enabled: enableCodex.trim().toLowerCase() !== 'n',
      },
    },
  };

  const yamlStr = yaml.stringify(defaultConfig);
  fs.writeFileSync(configPath, yamlStr, 'utf8');
  console.log(`\n✅ Setup complete! Configuration saved to ${configPath}`);
}
