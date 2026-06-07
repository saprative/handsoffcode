import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
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

export function initConfig(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    throw new Error(`Configuration already exists at ${configPath}`);
  }

  const defaultConfig: Config = {
    telegram: {
      bot_token: 'YOUR_BOT_TOKEN_HERE',
      chat_id: 'YOUR_CHAT_ID_HERE',
    },
    agents: {
      antigravity: {
        enabled: true,
      },
      claude: {
        enabled: true,
      },
      codex: {
        enabled: true,
      },
    },
  };

  const yamlStr = yaml.stringify(defaultConfig);
  fs.writeFileSync(configPath, yamlStr, 'utf8');
  console.log(`Initialized configuration at ${configPath}`);
}
