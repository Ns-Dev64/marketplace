import os from "os"
import {spawn} from "child_process"

const numCPUs = os.cpus().length;


for (let i = 0; i < numCPUs; i++) {
  const worker = spawn("bun", ["index.ts"], {
    stdio: "inherit",
    env: { ...process.env, WORKER_ID: i.toString() }
  });

  worker.on("exit", (code) => {
    console.log(`Worker ${i} exited with code ${code}`);
  });

}
