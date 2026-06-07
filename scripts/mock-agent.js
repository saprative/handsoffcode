const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`Starting mock agent with task: ${process.argv[2] || 'unknown task'}`);
console.log('Analyzing requirements...');
setTimeout(() => {
  console.log('Building implementation plan...');
  setTimeout(() => {
    console.log('Plan created. APPROVAL_REQUIRED');
    rl.question('', (answer) => {
      if (answer.trim().toLowerCase() === 'y') {
        console.log('Approval received. Proceeding with execution...');
        setTimeout(() => {
          console.log('Writing files...');
          setTimeout(() => {
            console.log('Task completed successfully!');
            process.exit(0);
          }, 2000);
        }, 1000);
      } else {
        console.log('Approval rejected. Aborting task.');
        process.exit(1);
      }
    });
  }, 3000);
}, 2000);
