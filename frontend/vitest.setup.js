// Mock config module
vi.mock("./src/config", () => ({
  API_BASE: "http://localhost:8787",
}));

// Mock stelllar module to include setActiveNetwork from network
const actualStellar = await vi.importActual("./src/stellar");
const networkModule = await vi.importActual("./src/network");
vi.mock("./src/stellar", () => ({
  ...actualStellar,
  setActiveNetwork: networkModule.setActiveNetwork,
}));
