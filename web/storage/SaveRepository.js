const DATABASE_NAME = "cube-chess-512";
const DATABASE_VERSION = 1;
const STORE_NAME = "game-saves";

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed")),
      { once: true },
    );
  });
}

function transactionFinished(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true },
    );
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true },
    );
  });
}

export class SaveRepository {
  constructor(indexedDb = globalThis.indexedDB) {
    this.indexedDb = indexedDb;
    this.memoryFallback = new Map();
    this.databasePromise = null;
  }

  async database() {
    if (!this.indexedDb) return null;
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = this.indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
        request.addEventListener("upgradeneeded", () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            const store = database.createObjectStore(STORE_NAME, {
              keyPath: "id",
            });
            store.createIndex("savedAt", "savedAt");
          }
        });
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("IndexedDB open failed")),
          { once: true },
        );
      });
    }
    return this.databasePromise;
  }

  createRecord(serialized, { id, name } = {}) {
    const now = new Date().toISOString();
    const config = serialized.gameConfig ?? {};
    return {
      id: id ?? serialized.id,
      name: String(name || `${config.whiteName ?? "White"} vs ${config.blackName ?? "Black"}`),
      savedAt: now,
      startedAt: serialized.startedAt ?? now,
      mode: config.mode ?? "local",
      whiteName: config.whiteName ?? "White",
      blackName: config.blackName ?? "Black",
      status: serialized.state?.status?.kind ?? "active",
      moveCount: serialized.history?.length ?? 0,
      payload: { ...serialized, savedAt: now },
    };
  }

  async put(serialized, options = {}) {
    const record = this.createRecord(serialized, options);
    const database = await this.database();
    if (!database) {
      this.memoryFallback.set(record.id, structuredClone(record));
      return record;
    }
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionFinished(transaction);
    return record;
  }

  async list() {
    const database = await this.database();
    let records;
    if (!database) {
      records = [...this.memoryFallback.values()].map((item) => structuredClone(item));
    } else {
      const transaction = database.transaction(STORE_NAME, "readonly");
      records = await requestResult(transaction.objectStore(STORE_NAME).getAll());
      await transactionFinished(transaction);
    }
    return records.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  }

  async get(id) {
    const database = await this.database();
    if (!database) return structuredClone(this.memoryFallback.get(id) ?? null);
    const transaction = database.transaction(STORE_NAME, "readonly");
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(id));
    await transactionFinished(transaction);
    return record ?? null;
  }

  async delete(id) {
    const database = await this.database();
    if (!database) return this.memoryFallback.delete(id);
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionFinished(transaction);
    return true;
  }

  async rename(id, name) {
    const record = await this.get(id);
    if (!record) return null;
    record.name = String(name || record.name).trim() || record.name;
    record.savedAt = new Date().toISOString();
    const database = await this.database();
    if (!database) {
      this.memoryFallback.set(id, record);
      return record;
    }
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionFinished(transaction);
    return record;
  }
}
