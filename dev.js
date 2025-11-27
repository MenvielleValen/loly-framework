const { spawn } = require("child_process");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Error: debes pasar un comando");
  console.log("Uso: node ejecutar.js <comando> [argumentos...]");
  process.exit(1);
}

const [app] = args;

const command = `pnpm --filter ${app} dev`;

console.log(`Exec: ${command}`);

// Ejecutamos el comando
const proc = spawn(command, [], {
  stdio: "inherit", // importante: muestra la salida en tiempo real
  shell: true, // permite usar comandos como "npm", "code .", etc.
});

proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`El comando falló con código ${code}`);
    process.exit(code);
  }
});
