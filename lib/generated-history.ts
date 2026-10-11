export type GeneratedHistoryItem = {
  id: string;
  prompt: string;
  seed?: number;
  width: number;
  height: number;
  mimeType: string;
  imageBase64: string;
  createdAt: string;
};

const DATABASE = "kritiva-local-workspace";
const STORE = "generated-images";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local workspace is unavailable."));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local workspace operation failed."));
    tx.oncomplete = () => database.close();
  });
}

export const saveGeneratedImage = (item: GeneratedHistoryItem) => transaction("readwrite", (store) => store.put(item));
export const getGeneratedImage = (id: string) => transaction<GeneratedHistoryItem | undefined>("readonly", (store) => store.get(id));
export const deleteGeneratedImage = (id: string) => transaction("readwrite", (store) => store.delete(id));
export const clearGeneratedImages = () => transaction("readwrite", (store) => store.clear());

export async function listGeneratedImages() {
  const items = await transaction<GeneratedHistoryItem[]>("readonly", (store) => store.getAll());
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function base64ToFile(item: Pick<GeneratedHistoryItem, "imageBase64" | "mimeType">, filename = "generated-image") {
  const binary = window.atob(item.imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const extension = item.mimeType === "image/png" ? "png" : item.mimeType === "image/webp" ? "webp" : "jpg";
  return new File([bytes], `${filename}.${extension}`, { type: item.mimeType });
}
