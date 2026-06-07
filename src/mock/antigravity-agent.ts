import readline from 'readline';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const inputArgs = process.argv.slice(2).join(' ');
  console.log(`[Antigravity Mock] Starting task with input: "${inputArgs}"`);
  
  await sleep(1000);
  console.log(`[Antigravity Mock] Analyzing codebase...`);
  await sleep(1500);
  console.log(`[Antigravity Mock] Found 3 files to modify.`);
  await sleep(1000);
  console.log(`[Antigravity Mock] Preparing deployment scripts...`);
  
  // Emit approval required event
  console.log(JSON.stringify({
    event: 'approval_required',
    message: 'Deploy to production?'
  }));

  // Wait for stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  for await (const line of rl) {
    const text = line.trim().toLowerCase();
    if (text === 'approve' || text === 'yes') {
      console.log(`[Antigravity Mock] Approval received. Proceeding with deployment...`);
      await sleep(1500);
      console.log(`[Antigravity Mock] Deployment successful!`);
      process.exit(0);
    } else if (text === 'reject' || text === 'no') {
      console.log(`[Antigravity Mock] Rejection received. Aborting task.`);
      process.exit(1);
    }
  }
}

run().catch(err => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});
