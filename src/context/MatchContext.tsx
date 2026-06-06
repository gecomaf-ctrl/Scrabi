import React, { createContext, useContext, useState } from "react";
import { GboloDoc, MatchGboloDoc, publishMatchState } from "../firebase";

export type GameRule = "GBOLO";
export type MatchMode = "DUEL" | "ROTATION_ROI";

export interface Player {
  id: string;
  name: string;
  score: number;
  stats?: {
    wins: number;
    matchesPlayed: number;
  };
}

export interface MatchHistoryEntry {
  id: string;
  playerIndex: number; // 0 ou 1, ou arbitraire
  playerName: string;
  word: string;
  score: number;
  coordinates: string; // Ex: H8
  timestamp: string;
  breakdown?: string;
  isContested?: boolean;
  bonusPoints?: number;
}

interface MatchContextType {
  // Configuration State
  mode: MatchMode;
  rule: GameRule;
  rounds: number;
  players: Player[];
  
  // Game Play State
  isMatchStarted: boolean;
  activePlayerIndex: number;
  board: string[][]; // 15x15
  history: MatchHistoryEntry[];
  currentRound: number;
  
  // Contestation / Dispute State
  contestationBonuses: Record<string, number>;
  
  // Rotation ROI specific state (retained/repurposed for compatibility)
  rotationPlayersQueue: string[]; // Liste d'attente des pseudos des challengers
  kingIndex: number; // Index du Roi actuel dans la liste des joueurs actifs
  kingStreak: number;
  historyMatchArchive: Array<{
    id: string;
    mode: MatchMode;
    players: Array<{ name: string; score: number }>;
    winnerName: string;
    timestamp: string;
    createdAt?: string;
    history?: MatchHistoryEntry[];
    kingStreak: number;
    isDraw?: boolean;
  }>;

  // New persistent states for registering multiple players & managing round-robin style pairing selection
  registeredPlayers: string[];
  finishedMatch: { 
    winnerName: string; 
    winnerScore: number; 
    loserName: string; 
    loserScore: number;
    isDraw?: boolean;
    p1Name?: string;
    p2Name?: string;
    p1Score?: number;
    p2Score?: number;
  } | null;
  
  // Actions
  setupDuel: (p1: string, p2: string, rule: GameRule, rounds: number) => void;
  setupRotation: (initialPlayers: string[], autoMode: boolean) => void;
  startMatch: () => void;
  resetMatch: () => void;
  submitWord: (playerIndex: number, word: string, score: number, coords: string, breakdown?: string) => void;
  contestHistoryEntry: (id: string) => void;
  removeHistoryEntry: (id: string) => void;
  editHistoryEntry: (id: string, word: string, score: number, coords: string, breakdown?: string) => void;
  pivotRotationKing: () => void;
  clearHistoryMatchArchive: () => void;
  setRotationPlayersQueue: React.Dispatch<React.SetStateAction<string[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;

  // New Actions
  setRegisteredPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setFinishedMatch: React.Dispatch<React.SetStateAction<{ 
    winnerName: string; 
    winnerScore: number; 
    loserName: string; 
    loserScore: number;
    isDraw?: boolean;
    p1Name?: string;
    p2Name?: string;
    p1Score?: number;
    p2Score?: number;
  } | null>>;
  startNewMatch: (p1: string, p2: string) => void;
  finishCurrentMatch: () => void;
  contestLastWord: () => Promise<{ success: boolean; challengerName: string; challengedWord: string; isValidODS9: boolean; message: string, checkedWords?: { word: string; isValid: boolean; cells: { row: number; col: number }[] }[] } | null>;
  activeGbolo: GboloDoc | null;
  activeMatchId: string | null;
  setActiveGbolo: (g: GboloDoc | null) => void;
  setActiveMatchId: (id: string | null) => void;
  contestState: MatchGboloDoc["contestState"] | null;
  setContestState: React.Dispatch<React.SetStateAction<MatchGboloDoc["contestState"] | null>>;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

// Helper to parse coordinates like "H8V" or "A15H"
export function parseCoordinates(coordStr: string): { row: number, col: number, direction: "H" | "V" } | null {
  const match = coordStr.toUpperCase().match(/^([A-O])([0-9]{1,2})([HV])?$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNum = parseInt(match[2]);
  const dir = (match[3] as "H" | "V") || "H";

  const col = colLetter.charCodeAt(0) - 65;
  const row = rowNum - 1;

  if (row < 0 || row >= 15 || col < 0 || col >= 15) return null;
  return { row, col, direction: dir };
}

// Regenerates board array chronologically
export function regenerateBoard(historyList: MatchHistoryEntry[]): string[][] {
  const newBoard = Array(15).fill(null).map(() => Array(15).fill(""));
  // On doit appliquer les coups du plus ancien au plus récent
  const chronological = [...historyList].reverse();
  
  for (const entry of chronological) {
    if (entry.isContested) continue;
    if (entry.word === "PASSE" || entry.word === "PASSER") continue;

    const parsed = parseCoordinates(entry.coordinates);
    if (!parsed) continue;
    
    let { row, col, direction } = parsed;
    const word = entry.word;
    
    for (let i = 0; i < word.length; i++) {
      if (row >= 15 || col >= 15) break;
      newBoard[row][col] = word[i];
      if (direction === "H") {
        col++;
      } else {
        row++;
      }
    }
  }
  return newBoard;
}

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const getSaved = (key: string, defaultValue: any) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing key " + key, e);
        }
      }
    }
    return defaultValue;
  };

  // Config
  const [mode, setMode] = useState<MatchMode>(() => getSaved("scrabble_arena_mode", "ROTATION_ROI"));
  const [rule, setRule] = useState<GameRule>(() => getSaved("scrabble_arena_rule", "GBOLO"));
  const [rounds, setRounds] = useState<number>(() => getSaved("scrabble_arena_rounds", 1));
  const [players, setPlayers] = useState<Player[]>(() => getSaved("scrabble_arena_players", [
    { id: "1", name: "Joueur Hôte", score: 0 },
    { id: "2", name: "Challenger", score: 0 },
  ]));

  // Playback
  const [isMatchStarted, setIsMatchStarted] = useState<boolean>(() => getSaved("scrabble_arena_is_match_started", false));
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(() => getSaved("scrabble_arena_active_player_index", 0));
  const [board, setBoard] = useState<string[][]>(() => 
    regenerateBoard(getSaved("scrabble_arena_history", []))
  );
  const [history, setHistory] = useState<MatchHistoryEntry[]>(() => getSaved("scrabble_arena_history", []));
  const [currentRound, setCurrentRound] = useState<number>(() => getSaved("scrabble_arena_current_round", 1));

  // Rotation spécifique
  const [rotationPlayersQueue, setRotationPlayersQueue] = useState<string[]>(() => getSaved("scrabble_arena_rotation_players_queue", []));
  const [kingIndex, setKingIndex] = useState<number>(() => getSaved("scrabble_arena_king_index", 0));
  const [kingStreak, setKingStreak] = useState<number>(() => getSaved("scrabble_arena_king_streak", 0));

  // Registered players management pool
  const [registeredPlayers, setRegisteredPlayers] = useState<string[]>(() => getSaved("scrabble_arena_registered_players", [
    "Roi Scrabbleur",
    "Challenger Alpha",
    "Prétendant Beta",
    "Nouvel Invité"
  ]));
  const [finishedMatch, setFinishedMatch] = useState<{ 
    winnerName: string; 
    winnerScore: number; 
    loserName: string; 
    loserScore: number;
    isDraw?: boolean;
    p1Name?: string;
    p2Name?: string;
    p1Score?: number;
    p2Score?: number;
  } | null>(() => getSaved("scrabble_arena_finished_match", null));

  const [activeGbolo, setActiveGboloState] = useState<GboloDoc | null>(() => getSaved("scrabble_arena_active_gbolo", null));
  const [activeMatchId, setActiveMatchIdState] = useState<string | null>(() => getSaved("scrabble_arena_active_match_id", null));
  const [contestState, setContestState] = useState<MatchGboloDoc["contestState"] | null>(null);

  const setActiveGbolo = (g: GboloDoc | null) => {
    setActiveGboloState(g);
    if (g === null) {
      localStorage.removeItem("scrabble_arena_active_gbolo");
      localStorage.removeItem("scrabble_arena_active_match_id");
      setActiveMatchIdState(null);
    } else {
      localStorage.setItem("scrabble_arena_active_gbolo", JSON.stringify(g));
    }
  };

  const setActiveMatchId = (id: string | null) => {
    setActiveMatchIdState(id);
    if (id === null) {
      localStorage.removeItem("scrabble_arena_active_match_id");
    } else {
      localStorage.setItem("scrabble_arena_active_match_id", JSON.stringify(id));
    }
  };

  const [historyMatchArchive, setHistoryMatchArchive] = useState<Array<{
    id: string;
    mode: MatchMode;
    players: Array<{ name: string; score: number }>;
    winnerName: string;
    timestamp: string;
    kingStreak: number;
    isDraw?: boolean;
  }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scrabble_arena_history_archive");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse history match archive", e);
        }
      }
    }
    return [];
  });

  const [contestationBonuses, setContestationBonuses] = useState<Record<string, number>>(() => getSaved("scrabble_arena_contestation_bonuses", {}));

  // Keep localStorage perfectly synced on state changes
  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_contestation_bonuses", JSON.stringify(contestationBonuses));
  }, [contestationBonuses]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_mode", JSON.stringify(mode));
  }, [mode]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_rule", JSON.stringify(rule));
  }, [rule]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_rounds", JSON.stringify(rounds));
  }, [rounds]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_players", JSON.stringify(players));
  }, [players]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_is_match_started", JSON.stringify(isMatchStarted));
  }, [isMatchStarted]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_active_player_index", JSON.stringify(activePlayerIndex));
  }, [activePlayerIndex]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_history", JSON.stringify(history));
  }, [history]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_current_round", JSON.stringify(currentRound));
  }, [currentRound]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_rotation_players_queue", JSON.stringify(rotationPlayersQueue));
  }, [rotationPlayersQueue]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_king_index", JSON.stringify(kingIndex));
  }, [kingIndex]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_king_streak", JSON.stringify(kingStreak));
  }, [kingStreak]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_history_archive", JSON.stringify(historyMatchArchive));
  }, [historyMatchArchive]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_registered_players", JSON.stringify(registeredPlayers));
  }, [registeredPlayers]);

  React.useEffect(() => {
    localStorage.setItem("scrabble_arena_finished_match", JSON.stringify(finishedMatch));
  }, [finishedMatch]);

  // Synchronize game changes dynamically to Firebase in real-time
  React.useEffect(() => {
    if (!activeGbolo) return;

    const syncToFirebase = async () => {
      try {
        if (isMatchStarted && activeMatchId) {
          await publishMatchState(activeGbolo.id, activeMatchId, {
            joueur1: players[0]?.name || "Joueur 1",
            joueur2: players[1]?.name || "Joueur 2",
            score1: players[0]?.score || 0,
            score2: players[1]?.score || 0,
            statut: "en_cours",
            board: board,
            history: history,
            activePlayerIndex: activePlayerIndex,
            contestState: contestState
          });
        } else if (!isMatchStarted && finishedMatch && activeMatchId) {
          let finalScore1 = players[0]?.score || 0;
          let finalScore2 = players[1]?.score || 0;
          let p1Name = players[0]?.name || "Joueur 1";
          let p2Name = players[1]?.name || "Joueur 2";
          
          if (finishedMatch.p1Name) p1Name = finishedMatch.p1Name;
          if (finishedMatch.p2Name) p2Name = finishedMatch.p2Name;
          if (finishedMatch.p1Score !== undefined) finalScore1 = finishedMatch.p1Score;
          if (finishedMatch.p2Score !== undefined) finalScore2 = finishedMatch.p2Score;

          await publishMatchState(activeGbolo.id, activeMatchId, {
            joueur1: p1Name,
            joueur2: p2Name,
            score1: finalScore1,
            score2: finalScore2,
            statut: "termine",
            board: board,
            history: history,
            activePlayerIndex: activePlayerIndex,
            contestState: null
          });
        } else if (!isMatchStarted && !finishedMatch && activeMatchId) {
          await publishMatchState(activeGbolo.id, activeMatchId, {
            joueur1: "",
            joueur2: "",
            score1: 0,
            score2: 0,
            statut: "en_attente",
            board: Array(15).fill(null).map(() => Array(15).fill("")),
            history: [],
            activePlayerIndex: 0,
            contestState: null
          });
        }
      } catch (err) {
        console.error("Failed to sync match to Firebase:", err);
      }
    };

    // Use a small debounce to avoid flooding Firestore during typing or rapid inputs
    const timer = setTimeout(syncToFirebase, 250);
    return () => clearTimeout(timer);
  }, [activeGbolo, activeMatchId, isMatchStarted, finishedMatch, players, board, history, activePlayerIndex, contestState]);

  const finishCurrentMatch = () => {
    if (players.length < 2) return;
    const p1 = players[0];
    const p2 = players[1];

    const isDraw = p1.score === p2.score;

    if (isDraw) {
      // Archive this match to annals / history as a draw
      const newArchiveEntry = {
        id: Math.random().toString(36).substr(2, 9),
        mode,
        players: players.map(p => ({ name: p.name, score: p.score })),
        winnerName: "Match Nul",
        timestamp: new Date().toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date().toISOString(),
        history: [...history],
        kingStreak: 0,
        isDraw: true
      };
      setHistoryMatchArchive(prev => [newArchiveEntry, ...prev]);

      // Save final match detail for draw handling UI
      setFinishedMatch({
        winnerName: "",
        winnerScore: p1.score,
        loserName: "",
        loserScore: p2.score,
        isDraw: true,
        p1Name: p1.name,
        p2Name: p2.name,
        p1Score: p1.score,
        p2Score: p2.score
      });

      // Unset match started back to choice screen
      setIsMatchStarted(false);
      return;
    }

    // Determine winner based on score
    let winnerIdx = 0;
    let loserIdx = 1;
    if (p2.score > p1.score) {
      winnerIdx = 1;
      loserIdx = 0;
    }

    const winnerName = players[winnerIdx].name;
    const winnerScore = players[winnerIdx].score;
    const loserName = players[loserIdx].name;
    const loserScore = players[loserIdx].score;

    // Calculate consecutive wins (streak) for this winner
    let nextStreak = 1;
    if (historyMatchArchive.length > 0 && historyMatchArchive[0].winnerName === winnerName) {
      nextStreak = (historyMatchArchive[0].kingStreak || 0) + 1;
    } else {
      nextStreak = 1;
    }
    setKingStreak(nextStreak);

    // Archive this match to annals / history
    const newArchiveEntry = {
      id: Math.random().toString(36).substr(2, 9),
      mode,
      players: players.map(p => ({ name: p.name, score: p.score })),
      winnerName,
      timestamp: new Date().toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
      history: [...history],
      kingStreak: nextStreak,
      isDraw: false
    };
    setHistoryMatchArchive(prev => [newArchiveEntry, ...prev]);

    // Save final match detail for selection UI
    setFinishedMatch({
      winnerName,
      winnerScore,
      loserName,
      loserScore,
      isDraw: false
    });

    // Unset match started back to choice screen
    setIsMatchStarted(false);
  };

  const startNewMatch = (p1Name: string, p2Name: string) => {
    // Generate a fresh unique match identity for the new match session
    const nextMatchId = "match_" + Math.random().toString(36).substr(2, 9);
    setActiveMatchId(nextMatchId);

    setPlayers([
      { id: "1", name: p1Name || "Joueur 1", score: 0 },
      { id: "2", name: p2Name || "Joueur 2", score: 0 }
    ]);
    
    // Clear plate and moves
    setBoard(Array(15).fill(null).map(() => Array(15).fill("")));
    setHistory([]);
    setActivePlayerIndex(0);
    setFinishedMatch(null);
    setIsMatchStarted(true);
  };

  const pivotRotationKing = () => {
    finishCurrentMatch();
  };

  const setupDuel = (p1: string, p2: string, selectedRule: GameRule, selectedRounds: number) => {
    setMode("DUEL");
    setRule(selectedRule);
    setRounds(selectedRounds);
    setPlayers([
      { id: "1", name: p1 || "Joueur 1", score: 0 },
      { id: "2", name: p2 || "Joueur 2", score: 0 },
    ]);
    setIsMatchStarted(false);
  };

  const setupRotation = (initialPlayers: string[], autoMode: boolean) => {
    // Kept for signature compatibility
    setMode("ROTATION_ROI");
    setRegisteredPlayers(initialPlayers);
    setIsMatchStarted(false);
  };

  const startMatch = () => {
    setBoard(Array(15).fill(null).map(() => Array(15).fill("")));
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setHistory([]);
    setActivePlayerIndex(0);
    setFinishedMatch(null);
    setContestationBonuses({});
    setIsMatchStarted(true);
  };

  const resetMatch = () => {
    setIsMatchStarted(false);
    setHistory([]);
    setBoard(Array(15).fill(null).map(() => Array(15).fill("")));
    setFinishedMatch(null);
    setContestationBonuses({});
  };

  const submitWord = (playerIndex: number, word: string, score: number, coords: string, breakdown?: string) => {
    const rawPlayerName = players[playerIndex]?.name || `Joueur ${playerIndex + 1}`;
    const bonus = contestationBonuses[rawPlayerName] || 0;
    const finalScore = score + bonus;
    let finalBreakdown = breakdown || "";

    if (bonus > 0) {
      if (finalBreakdown) {
        finalBreakdown = `${finalBreakdown} | (dont Bonus de Contestation : +${bonus} pts)`;
      } else {
        finalBreakdown = `Bonus Contestation : +${bonus} pts`;
      }
      // Consume the bonus
      setContestationBonuses(prev => {
        const next = { ...prev };
        delete next[rawPlayerName];
        return next;
      });
    }

    const entry: MatchHistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      playerIndex,
      playerName: rawPlayerName,
      word: word, // Preserve casing for Joker detection!
      score: finalScore,
      coordinates: coords.toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
      breakdown: finalBreakdown,
      bonusPoints: bonus > 0 ? bonus : undefined
    };

    const nextHistory = [entry, ...history];
    setHistory(nextHistory);
    
    // Regénérer le plateau avec le nouveau mot placé
    setBoard(regenerateBoard(nextHistory));
    
    setPlayers(prev => prev.map((p, idx) => idx === playerIndex ? { ...p, score: p.score + finalScore } : p));
    
    // Alternance des joueurs
    setActivePlayerIndex(prev => (prev === 0 ? 1 : 0));
  };

  const contestLastWord = async (): Promise<{
    success: boolean;
    challengerName: string;
    challengedWord: string;
    isValidODS9: boolean;
    message: string;
    checkedWords?: { word: string; isValid: boolean }[];
  } | null> => {
    if (history.length === 0) return null;

    // Trouve le dernier coup qui n'est pas contesté, pas une passe, et pas vide
    const lastWordEntry = history.find(h => !h.isContested && h.word !== "PASSE" && h.word !== "PASSER");
    if (!lastWordEntry) {
      return null;
    }

    const challengedWord = lastWordEntry.word; // Preserve case!
    const challengedPlayerIdx = lastWordEntry.playerIndex;
    const challengedPlayerName = lastWordEntry.playerName;

    // Le contestataire / challenger est l'adversaire
    const challengerIdx = challengedPlayerIdx === 0 ? 1 : 0;
    const challengerName = players[challengerIdx]?.name || `Joueur ${challengerIdx + 1}`;

    // 1. Reconstruire l'état du plateau JUSTE AVANT que ce mot ne soit joué
    const lastWordIdx = history.findIndex(h => h.id === lastWordEntry.id);
    const entriesBefore = lastWordIdx !== -1 ? history.slice(lastWordIdx + 1) : [];
    const boardBefore = regenerateBoard(entriesBefore);

    // 2. Extraire tous les mots formés par ce coup (mot principal + mots d'appui croisés)
    const { getFormedWords } = await import("../logic/scrabbleEngine");
    const formedWords = getFormedWords(challengedWord, lastWordEntry.coordinates, boardBefore);

    // 3. Valider chaque mot par rapport à l'ODS9
    const { isWordValid } = await import("../logic/dictionary");
    const checkedWords: { word: string; isValid: boolean; cells: { row: number; col: number }[] }[] = [];

    if (formedWords.length > 0) {
      for (const fWord of formedWords) {
        const isValid = await isWordValid(fWord.word);
        checkedWords.push({
          word: fWord.word,
          isValid,
          cells: fWord.cells
        });
      }
    } else {
      const isValid = await isWordValid(challengedWord);
      checkedWords.push({
        word: challengedWord,
        isValid,
        cells: []
      });
    }

    // Le mot est jugé correct UNIQUEMENT si le mot principal ET TOUS les mots d'appui associés sont valides.
    // S'il y a la moindre infraction, le coup entier est annulé.
    const allValid = checkedWords.every(item => item.isValid);
    const invalidList = checkedWords.filter(item => !item.isValid).map(item => item.word);

    if (allValid) {
      // Contestation infructueuse : Le mot est valide, le coup est validé.
      // Le tour du contestataire passe et il obtient 0 point.
      const passReason = `Tour passé pour ${challengerName} suite à sa contestation infructueuse du mot '${challengedWord}'`;
      submitWord(challengerIdx, "PASSER", 0, "-", passReason);

      let formedDetails = "";
      if (checkedWords.length > 1) {
        formedDetails = ` (ainsi que les mots d'appui formés : ${checkedWords.filter(w => w.word !== challengedWord).map(w => `'${w.word}'`).join(", ")})`;
      }

      return {
        success: true,
        challengerName,
        challengedWord,
        isValidODS9: true,
        message: `Le mot '${challengedWord}'${formedDetails} est valide (présent dans l'ODS9). La contestation de ${challengerName} a échoué. Son tour est passé et il obtient 0 point !`,
        checkedWords
      };
    } else {
      // Contestation réussie : Le mot n'existe pas.
      // Le mot est retiré du plateau, le joueur fautif obtient 0 point,
      // et le contestataire obtient un bonus de +10 à son prochain coup.
      const updatedHistory = history.map(h => {
        if (h.id === lastWordEntry.id) {
          const detailInvalid = invalidList.map(w => `'${w}'`).join(" et ");
          return {
            ...h,
            score: 0,
            isContested: true,
            breakdown: `Faux mot contesté: '${h.word}' par ${h.playerName} annulé suite à des mots invalides (${detailInvalid})`
          };
        }
        return h;
      });

      setHistory(updatedHistory);
      setBoard(regenerateBoard(updatedHistory));

      // Recalculer les scores totaux
      const player0Score = updatedHistory.filter(h => h.playerIndex === 0).reduce((sum, h) => sum + h.score, 0);
      const player1Score = updatedHistory.filter(h => h.playerIndex === 1).reduce((sum, h) => sum + h.score, 0);
      setPlayers(prev => prev.map((p, idx) => {
        if (idx === 0) return { ...p, score: player0Score };
        if (idx === 1) return { ...p, score: player1Score };
        return p;
      }));

      // Accorder le bonus de +10 points pour le prochain coup du challenger
      setContestationBonuses(prev => ({
        ...prev,
        [challengerName]: (prev[challengerName] || 0) + 10
      }));

      // Construire un message explicatif extrêmement soigné et précis
      let invalidExplanation = "";
      if (invalidList.includes(challengedWord)) {
        if (invalidList.length === 1) {
          invalidExplanation = `Le mot principal '${challengedWord}' n'existe pas.`;
        } else {
          invalidExplanation = `Le mot principal '${challengedWord}' et le(s) mot(s) d'appui croisé(s) ${invalidList.filter(w => w !== challengedWord).map(w => `'${w}'`).join(", ")} n'existent pas.`;
        }
      } else {
        invalidExplanation = `Le mot principal '${challengedWord}' est valide, mais son placement a formé le(s) mot(s) d'appui invalide(s) : ${invalidList.map(w => `'${w}'`).join(", ")}.`;
      }

      return {
        success: true,
        challengerName,
        challengedWord,
        isValidODS9: false,
        message: `Contestation réussie ! ${invalidExplanation} Le coup de ${challengedPlayerName} est entièrement annulé (0 point d'accordé) et retiré de la grille. En récompense, ${challengerName} obtient un bonus de +10 points pour son prochain coup joué !`,
        checkedWords
      };
    }
  };

  const contestHistoryEntry = (id: string) => {
    const nextHistory = history.map(h => {
      if (h.id === id) {
        return {
          ...h,
          score: 0,
          isContested: true,
          breakdown: `Faux mot contesté: ${h.word} à ${h.coordinates} annulé (0 point)`
        };
      }
      return h;
    });
    setHistory(nextHistory);
    setBoard(regenerateBoard(nextHistory));

    // Recalculer les scores
    const player0Score = nextHistory.filter(h => h.playerIndex === 0).reduce((sum, h) => sum + h.score, 0);
    const player1Score = nextHistory.filter(h => h.playerIndex === 1).reduce((sum, h) => sum + h.score, 0);
    setPlayers(prev => prev.map((p, idx) => {
      if (idx === 0) return { ...p, score: player0Score };
      if (idx === 1) return { ...p, score: player1Score };
      return p;
    }));
  };

  const removeHistoryEntry = (id: string) => {
    const nextHistory = history.filter(h => h.id !== id);
    setHistory(nextHistory);
    
    // Recalculer le plateau après retrait d'un mot
    setBoard(regenerateBoard(nextHistory));

    // Recalculer les scores pour éviter toute dérive
    const player0Score = nextHistory.filter(h => h.playerIndex === 0).reduce((sum, h) => sum + h.score, 0);
    const player1Score = nextHistory.filter(h => h.playerIndex === 1).reduce((sum, h) => sum + h.score, 0);
    setPlayers(prev => prev.map((p, idx) => {
      if (idx === 0) return { ...p, score: player0Score };
      if (idx === 1) return { ...p, score: player1Score };
      return p;
    }));
  };

  const editHistoryEntry = (id: string, word: string, score: number, coords: string, breakdown?: string) => {
    const nextHistory = history.map(h => {
      if (h.id === id) {
        return {
          ...h,
          word: word,
          score,
          coordinates: coords.toUpperCase(),
          breakdown: breakdown || ""
        };
      }
      return h;
    });
    setHistory(nextHistory);
    setBoard(regenerateBoard(nextHistory));

    // Recalculer les scores après modification
    const player0Score = nextHistory.filter(h => h.playerIndex === 0).reduce((sum, h) => sum + h.score, 0);
    const player1Score = nextHistory.filter(h => h.playerIndex === 1).reduce((sum, h) => sum + h.score, 0);
    setPlayers(prev => prev.map((p, idx) => {
      if (idx === 0) return { ...p, score: player0Score };
      if (idx === 1) return { ...p, score: player1Score };
      return p;
    }));
  };

  const clearHistoryMatchArchive = () => {
    setHistoryMatchArchive([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("scrabble_arena_history_archive");
    }
  };

  return (
    <MatchContext.Provider value={{
      mode,
      rule,
      rounds,
      players,
      isMatchStarted,
      activePlayerIndex,
      board,
      history,
      currentRound,
      contestationBonuses,
      rotationPlayersQueue,
      kingIndex,
      kingStreak,
      historyMatchArchive,
      setupDuel,
      setupRotation,
      startMatch,
      resetMatch,
      submitWord,
      contestHistoryEntry,
      removeHistoryEntry,
      editHistoryEntry,
      pivotRotationKing,
      clearHistoryMatchArchive,
      setRotationPlayersQueue,
      setPlayers,
      registeredPlayers,
      finishedMatch,
      setRegisteredPlayers,
      setFinishedMatch,
      startNewMatch,
      finishCurrentMatch,
      contestLastWord,
      activeGbolo,
      activeMatchId,
      setActiveGbolo,
      setActiveMatchId,
      contestState,
      setContestState
    }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error("useMatch must be used within a MatchProvider");
  }
  return context;
}
