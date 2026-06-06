let dictionaryCache: Set<string> | null = null;
let isLoading = false;
let loadPromise: Promise<Set<string>> | null = null;

/**
 * Loads the ODS9 dictionary from the server-served static public asset /assets/ods9.json.
 * Splitting by newline and storing in an uppercase Set for instant O(1) matching.
 */
export function loadDictionary(): Promise<Set<string>> {
  if (dictionaryCache) {
    return Promise.resolve(dictionaryCache);
  }
  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = fetch("/assets/ods9.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement de la base de mots ODS9: ${response.statusText}`);
      }
      return response.text();
    })
    .then((text) => {
      const words = text.split(/\r?\n/);
      const set = new Set<string>();
      for (const rawWord of words) {
        const trimmed = rawWord.trim().toUpperCase();
        if (trimmed) {
          set.add(trimmed);
        }
      }
      dictionaryCache = set;
      isLoading = false;
      console.log(`Dictionnaire ODS9 prêt : ${set.size} mots chargés avec succès.`);
      return set;
    })
    .catch((error) => {
      isLoading = false;
      loadPromise = null;
      console.error("Échec du chargement du dictionnaire ODS9 :", error);
      // Fallback fallback to empty set to let the game play on errors
      const emptySet = new Set<string>();
      dictionaryCache = emptySet;
      return emptySet;
    });

  return loadPromise;
}

/**
 * Checks if a word is valid in the ODS9 dictionary.
 * Supports cleaning wildcard symbols/blank jokers characters if any are received.
 */
export async function isWordValid(word: string): Promise<boolean> {
  const dict = await loadDictionary();
  const cleanWord = word.trim().replace(/\*/g, "").toUpperCase();
  if (!cleanWord) return false;
  return dict.has(cleanWord);
}
