import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 8787;
const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK = process.env.NETWORK || "TESTNET";

const app = createApp();

app.listen(PORT, () => {
  console.log(`Kitewell backend listening on http://localhost:${PORT}`);
  console.log(`Network: ${NETWORK} · Horizon: ${HORIZON_URL}`);
});
