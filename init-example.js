const { spawn } = require("child_process");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Error: You must pass a command");
  console.log("Usage: node init-example.js [start|dev] [app name]");
  process.exit(1);
}

const [type, app] = args;

const command = `pnpm --filter ${app} ${type}`;

console.log(`Exec: ${command}`);

const proc = spawn(command, [], {
  stdio: "inherit",
  shell: true,
});

proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`The command failed ${code}`);
    process.exit(code);
  }
});
