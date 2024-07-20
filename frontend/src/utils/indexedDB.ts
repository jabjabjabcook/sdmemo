import Dexie, { Table } from 'dexie';

const defaultPositiveDict = {
  'pony Quality Tags Anime': ['score_9', 'score_8_up', 'score_7_up', 'rating_safe', 'masterpiece', 'best quality', 'absurdres', '8k wallpaper', 'source_anime', 'uncensored'],
  'pony Quality Tags Realistic': ['score_9', 'score_8_up', 'score_7_up', 'rating_safe', 'masterpiece', 'best quality', 'absurdres', '8k wallpaper', 'realistic', 'uncensored'],
  'sd1.5 Quality Tags': ['high quality', 'ultra detailed', 'best quality', 'insanely detailed', 'beautiful', 'masterpiece'],
};

const defaultNegativeDict = {
  'pony Quality Tags Anime': ['score_4', 'score_5', 'score_6', 'worst quality', 'low quality', 'normal quality', 'lowres', 'bad anatomy', 'bad hands', 'text', 'error', 'missing limb', 'missing fingers', 'extra digit', 'fewer digits', 'extra arms', 'extra fingers', 'multiple fingers', 'cropped', 'artifacts', 'signature', 'watermark', 'username', 'monochrome', 'greyscale', 'flat color', 'realistic', '3d', 'video', 'source_filmmaker', 'artist name', 'source_pony', 'source_furry', 'source_cartoon', 'mature female'],
  'pony Quality Tags Realistic': ['score_4', 'score_5', 'score_6', 'worst quality', 'low quality', 'normal quality', 'lowres', 'bad anatomy', 'bad hands', 'text', 'error', 'missing limb', 'missing fingers', 'extra digit', 'fewer digits', 'extra arms', 'extra fingers', 'multiple fingers', 'cropped', 'artifacts', 'signature', 'watermark', 'username', 'monochrome', 'greyscale', 'flat color', 'source_anime', '3d', 'video', 'source_filmmaker', 'artist name', 'source_pony', 'source_furry', 'source_cartoon', 'mature female'],
  'sd1.5 Quality Tags': ['low quality', 'subpar quality', 'bad anatomy', 'bad face', '(moles: 2)', 'out of focus', 'blurry'],
};


type dictionary = {
  [key: string]: string[];
};

type uuidV6 = string;


class MyDexieDB extends Dexie {
  promptDictionaries!: Table<{ type: 'positive' | 'negative', name: string, dictionary: Record<string, string[]> }, [string, string]>;

  constructor() {
    super("PromptDictionary");
    this.version(1).stores({
      promptDictionaries: '[type+name], type, name, dictionary'
    });
  }
}

export const indexedDb = new MyDexieDB();

export async function checkAndInitializeDB(): Promise<void> {
  async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${isPersisted}`);
    } else {
      console.log("Persistent storage API is not supported in this browser.");
    }
  }

  requestPersistentStorage();

  const entryPositive = await indexedDb.promptDictionaries.get({ type: 'positive', name: 'default' });
  if (!entryPositive) {
    await indexedDb.promptDictionaries.put({ type: 'positive', name: 'default', dictionary: defaultPositiveDict });
  }
  const entryNegative = await indexedDb.promptDictionaries.get({ type: 'negative', name: 'default' });
  if (!entryNegative) {
    await indexedDb.promptDictionaries.put({ type: 'negative', name: 'default', dictionary: defaultNegativeDict });
  }
}

export async function addToDictionary(type: 'positive' | 'negative', dictName: string, index: string, tags: string[]): Promise<void> {
  const entry = await indexedDb.promptDictionaries.get({ type, name: dictName });
  if (entry) {
    entry.dictionary[index] = tags;
    const sortedKeys = Object.keys(entry.dictionary).sort((a, b) => a.localeCompare(b, 'ja'));
    const sortedDictionary = sortedKeys.reduce((acc, key) => {
      acc[key] = entry.dictionary[key];
      return acc;
    }, {} as typeof entry.dictionary);

    entry.dictionary = sortedDictionary;
    await indexedDb.promptDictionaries.put(entry);
  } else {
    await indexedDb.promptDictionaries.put({ type, name: dictName, dictionary: { [index]: tags } });
  }
}

export async function updateDictionary(type: 'positive' | 'negative', dictName: string, dictionary: Record<string, string[]>): Promise<void> {
  await indexedDb.promptDictionaries.put({ type, name: dictName, dictionary });
}

export async function getPositiveDictionaries(): Promise<string[]> {
  const entries = await indexedDb.promptDictionaries.toArray();
  return entries.filter(entry => entry.type === 'positive').map(entry => entry.name);
}

export async function getNegativeDictionaries(): Promise<string[]> {
  const entries = await indexedDb.promptDictionaries.toArray();
  return entries.filter(entry => entry.type === 'negative').map(entry => entry.name);
}

export async function getDictionary(type: 'positive' | 'negative', dictName: string): Promise<Record<string, string[]>> {
  const entry = await indexedDb.promptDictionaries.get({ type, name: dictName });
  if (!entry) {
    throw new Error(`Dictionary ${dictName} of type ${type} not found`);
  }
  return entry.dictionary;
}

export async function createNewDictionary(type: 'positive' | 'negative', dictName: string, dictionary: Record<string, string[]> = {}): Promise<void> {
  await indexedDb.promptDictionaries.put({ type, name: dictName, dictionary });
}

export async function deleteDictionary(type: 'positive' | 'negative', dictName: string): Promise<void> {
  const entry = await indexedDb.promptDictionaries.get({ type, name: dictName });
  if (entry) {
    await indexedDb.promptDictionaries.delete([type, dictName]);
  }
}

export async function isExistDictionary(type: 'positive' | 'negative', dictName: string): Promise<boolean> {
  const entry = await indexedDb.promptDictionaries.get({ type, name: dictName });
  return !!entry;
}

export const generateUUIDv6 = (): string => {
  const getRandomValues = (length: number): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
  };

  const timestamp = Date.now();
  const timeHex = timestamp.toString(16).padStart(12, '0');
  const randomValues = getRandomValues(10);

  const uuid = `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-6${randomValues.slice(0, 3)}-${(parseInt(randomValues.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${randomValues.slice(4, 7)}-${randomValues.slice(7)}`;

  return uuid;
}