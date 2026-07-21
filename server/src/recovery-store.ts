import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "data", "recovery-codes.json");

type RecoveryStore = Record<string, string>;

const readStore = async (): Promise<RecoveryStore> => {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as RecoveryStore;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
};

const writeStore = async (store: RecoveryStore): Promise<void> => {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
};

export const getRecoveryCode = async (
  userId: string,
): Promise<string | undefined> => {
  const store = await readStore();
  return store[userId];
};

export const saveRecoveryCode = async (
  userId: string,
  code: string,
): Promise<void> => {
  const store = await readStore();
  store[userId] = code;
  await writeStore(store);
};
