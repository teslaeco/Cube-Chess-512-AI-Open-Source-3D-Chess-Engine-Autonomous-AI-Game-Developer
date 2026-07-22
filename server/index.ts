import { GameServer } from "./GameServer.js";

const server = new GameServer();
const port = await server.start(
  Number(process.env.PORT) || 8787,
  "0.0.0.0",
);
console.log(`Cube Chess 512 test server listening on port ${port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
