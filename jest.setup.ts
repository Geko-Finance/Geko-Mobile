import { beforeEach, jest } from "@jest/globals";

const mockSecureValues = new Map<string, string>();

// Wallet unit tests are fully offline. Avoid Axios probing Expo's virtual
// streams and keep optional browser-wallet adapters in their non-browser path.
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: undefined,
  writable: true,
});
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: undefined,
  writable: true,
});

const mockAxios = {
  create: jest.fn(),
  defaults: {},
  delete: jest.fn(),
  get: jest.fn(),
  interceptors: {
    request: { eject: jest.fn(), use: jest.fn() },
    response: { eject: jest.fn(), use: jest.fn() },
  },
  patch: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};
mockAxios.create.mockReturnValue(mockAxios);

jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxios,
}));

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureValues.delete(key);
  }),
  getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureValues.set(key, value);
  }),
}));

beforeEach(() => {
  mockSecureValues.clear();
});
