/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  setLogLevel
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Set Silent Log Level to prevent unhandled background connection errors from hijacking the log stream in sandboxed runners
setLogLevel("silent");

// Initialize app & firestore with databaseId
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn("Firestore Error handled: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection strictly to meet skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration or network status.");
    } else {
      console.warn("Firebase client is currently operating in offline mode. Local caching active.");
    }
  }
}
testConnection();

// Get or initialize unique client signature to preserve creator authorization without sign-in requirements
export function getCreatorToken(): string {
  let token = localStorage.getItem("scrabble_arena_creator_token");
  if (!token) {
    token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("scrabble_arena_creator_token", token);
  }
  return token;
}

// Generate an elegant, easily shareable 6-digit code (e.g. 8XK92A)
export function generateGboloCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed easily confusing characters like I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface GboloDoc {
  id: string; // The 6-character code
  nom: string;
  code_public: string;
  statut: string; // 'en_cours', 'termine'
  creatorId: string;
  createdAt: string;
}

export interface MatchGboloDoc {
  id: string;
  gbolo_id: string;
  joueur1: string;
  joueur2: string;
  score1: number;
  score2: number;
  statut: "en_attente" | "en_cours" | "termine";
  board: string[][];
  history: any[];
  activePlayerIndex: number;
  updatedAt: string;
  creatorId: string;
  contestState?: {
    isPending: boolean;
    word: string;
    coordinates?: string;
    playerName?: string;
    verdict?: "valid" | "invalid" | null;
    timestamp?: string;
    highlightedCells?: string[];
  } | null;
}

/**
 * Creates a brand new shared Gbôlô environment
 */
export async function createGbolo(nom: string): Promise<GboloDoc> {
  const code = generateGboloCode();
  const creatorId = getCreatorToken();
  const timestamp = new Date().toISOString();

  const gboloData: GboloDoc = {
    id: code,
    nom: nom.trim(),
    code_public: code,
    statut: "en_cours",
    creatorId,
    createdAt: timestamp
  };

  try {
    await setDoc(doc(db, "gbolos", code), gboloData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gbolos/${code}`);
  }
  return gboloData;
}

/**
 * Fetches Gbôlô info using Gbolo public code
 */
export async function fetchGbolo(gboloIdOrCode: string): Promise<GboloDoc | null> {
  const cleaned = gboloIdOrCode.trim().toUpperCase();
  const dRef = doc(db, "gbolos", cleaned);
  
  let snap;
  try {
    snap = await getDoc(dRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `gbolos/${cleaned}`);
  }

  if (snap.exists()) {
    return snap.data() as GboloDoc;
  }

  // Fallback: search by code_public
  const q = query(collection(db, "gbolos"), where("code_public", "==", cleaned));
  let querySnap;
  try {
    querySnap = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "gbolos");
  }

  if (!querySnap.empty) {
    return querySnap.docs[0].data() as GboloDoc;
  }

  return null;
}

// Helper to serialize string[][] into a flat 1D string[] to bypass Firestore nested array limitation
export function serializeBoard(board: string[][]): string[] {
  if (!board || !Array.isArray(board)) return Array(225).fill("");
  const flat: string[] = [];
  for (let r = 0; r < 15; r++) {
    const row = board[r] || Array(15).fill("");
    for (let c = 0; c < 15; c++) {
      flat.push(row[c] || "");
    }
  }
  return flat;
}

// Helper to deserialize a flat 1D string[] or 2D string[][] back into a 15x15 string[][]
export function deserializeBoard(flat: any): string[][] {
  const result: string[][] = Array(15).fill(null).map(() => Array(15).fill(""));
  if (!flat || !Array.isArray(flat)) return result;
  
  if (Array.isArray(flat[0])) {
    // Already is a 2D array, fallback gracefully
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        result[r][c] = (flat[r] && flat[r][c]) || "";
      }
    }
    return result;
  }

  for (let i = 0; i < 225; i++) {
    const r = Math.floor(i / 15);
    const c = i % 15;
    if (r < 15 && c < 15) {
      result[r][c] = flat[i] || "";
    }
  }
  return result;
}

// Helper to recursively remove undefined values from objects/arrays to satisfy Firestore rules/safeguards
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        res[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

/**
 * Publishes or updates a Match played inside a Gbôlô
 */
export async function publishMatchState(
  gboloId: string,
  matchId: string,
  matchState: Omit<MatchGboloDoc, "gbolo_id" | "id" | "updatedAt" | "creatorId">
): Promise<void> {
  const creatorId = getCreatorToken();
  const timestamp = new Date().toISOString();

  const matchData = {
    ...matchState,
    id: matchId,
    gbolo_id: gboloId,
    creatorId,
    updatedAt: timestamp,
    board: serializeBoard(matchState.board)
  };

  const cleaned = sanitizeForFirestore(matchData);
  try {
    await setDoc(doc(db, "matchs", matchId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `matchs/${matchId}`);
  }
}

/**
 * Real-time subscription to active or ending matches of a specific Gbôlô
 */
export function subscribeToGboloMatches(
  gboloId: string,
  onUpdate: (matches: MatchGboloDoc[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, "matchs"),
    where("gbolo_id", "==", gboloId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const matches: MatchGboloDoc[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        matches.push({
          ...data,
          board: deserializeBoard(data.board)
        } as MatchGboloDoc);
      });
      // Sort matches chronologically based on updatedAt to ensure correct active ordering
      matches.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      onUpdate(matches);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, "matchs");
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
        } else if (onError) {
          onError(error as Error);
        }
      }
    }
  );
}
