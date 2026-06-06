import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMatch, regenerateBoard } from "../context/MatchContext";
import { ArrowLeft, Play, LayoutGrid, Crown, Trophy, RefreshCw, Users, HelpCircle as HelpIcon, ArrowRight, ShieldCheck, AlertCircle, Check, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Board from "../components/Board";
import ScoreBoard from "../components/ScoreBoard";
import MoveForm from "../components/MoveForm";
import MoveHistory from "../components/MoveHistory";
import { calculateScore, validateLetterLimits, getFormedWords } from "../logic/scrabbleEngine";

export default function Match() {
  const { theme } = useTheme();
  const { 
    isMatchStarted, 
    board, 
    registeredPlayers, 
    finishedMatch, 
    setFinishedMatch,
    startNewMatch, 
    finishCurrentMatch,
    kingStreak,
    activePlayerIndex,
    players,
    submitWord,
    history,
    contestLastWord,
    contestationBonuses,
    contestState,
    setContestState
  } = useMatch();
  
  // Track state for the referee move entry form
  const [word, setWord] = useState("");
  const [coords, setCoords] = useState("");
  const [direction, setDirection] = useState<"H" | "V">("H");
  const [adjustment, setAdjustment] = useState<number>(0);

  // States for ODS9 Contest logic
  const [isContesting, setIsContesting] = useState(false);
  const [showContestConfirm, setShowContestConfirm] = useState(false);
  const [contestNotification, setContestNotification] = useState<{
    show: boolean;
    challenger: string;
    word: string;
    isValid: boolean;
    message: string;
    checkedWords?: { word: string; isValid: boolean; cells: { row: number; col: number }[] }[];
  } | null>(null);

  // Highlighting cells of contested words
  const [contestedHighlights, setContestedHighlights] = useState<Record<string, "green" | "red" | null>>({});
  const contestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleConfirmContest = () => {
    setShowContestConfirm(false);
    handleContest();
  };

  const speakNotification = (text: string) => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Erreur de synthèse vocale :", err);
      }
    }
  };

  // Last contestable word: find the non-contested, non-pass entry in history
  const lastContestableEntry = history ? history.find(h => !h.isContested && h.word !== "PASSE" && h.word !== "PASSER") : null;

  const handleContest = async () => {
    if (!lastContestableEntry) return;
    setIsContesting(true);

    if (contestTimeoutRef.current) {
      clearTimeout(contestTimeoutRef.current);
      contestTimeoutRef.current = null;
    }

    try {
      // 1. Reconstruct board state right before the contested word was played
      const lastWordIdx = history.findIndex(h => h.id === lastContestableEntry.id);
      const entriesBefore = lastWordIdx !== -1 ? history.slice(lastWordIdx + 1) : [];
      const boardBefore = regenerateBoard(entriesBefore);

      // 2. Identify the cells of all the words formed by this move
      const formedWords = getFormedWords(lastContestableEntry.word, lastContestableEntry.coordinates, boardBefore);
      const pendingCells: string[] = [];
      for (const item of formedWords) {
        for (const cell of item.cells) {
          pendingCells.push(`${cell.row}-${cell.col}`);
        }
      }
      if (pendingCells.length === 0) {
        // Fallback
        const { parseCoordinates } = await import("../context/MatchContext");
        const parsed = parseCoordinates(lastContestableEntry.coordinates);
        if (parsed) {
          pendingCells.push(`${parsed.row}-${parsed.col}`);
        }
      }

      // 3. Mark the contest state as pending on Firestore & local so spectators are alerted
      setContestState({
        isPending: true,
        word: lastContestableEntry.word,
        coordinates: lastContestableEntry.coordinates,
        playerName: lastContestableEntry.playerName,
        verdict: null,
        highlightedCells: pendingCells,
        timestamp: new Date().toISOString()
      });

      // Show temporary local pending highlights on the active board too
      const tempHighlights: Record<string, "pending"> = {};
      for (const cellKey of pendingCells) {
        tempHighlights[cellKey] = "pending";
      }
      setContestedHighlights(tempHighlights);

      // 4. Suspend/Sleep for 2.5 seconds to build suspense and let the spectator see the flashing checking alert
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 5. Execute the true verification via ODS9
      const result = await contestLastWord();
      if (result) {
        const highlights: Record<string, "green" | "red" | null> = {};
        if (result.checkedWords) {
          for (const item of result.checkedWords) {
            const status = item.isValid ? "green" : "red";
            for (const cell of item.cells) {
              const key = `${cell.row}-${cell.col}`;
              if (highlights[key] !== "red") {
                highlights[key] = status;
              }
            }
          }
        }
        setContestedHighlights(highlights);

        setContestNotification({
          show: true,
          challenger: result.challengerName,
          word: result.challengedWord,
          isValid: result.isValidODS9,
          message: result.message,
          checkedWords: result.checkedWords
        });

        // Publish the result/verdict on Firestore for spectators
        const verdict = result.isValidODS9 ? "valid" : "invalid";
        setContestState({
          isPending: false,
          word: result.challengedWord,
          coordinates: lastContestableEntry.coordinates,
          playerName: lastContestableEntry.playerName,
          verdict: verdict,
          highlightedCells: pendingCells,
          timestamp: new Date().toISOString()
        });

        // Speech synthesis for valid move
        if (result.isValidODS9) {
          speakNotification("Le coup joué est valide");
        }

        // Automatic dismiss after 5s
        contestTimeoutRef.current = setTimeout(() => {
          setContestNotification(null);
          setContestedHighlights({});
          setContestState(null); // Clear public contest state when dismissed
        }, 5000);
      }
    } catch (e) {
      console.error("Erreur lors de la contestation :", e);
      setContestState(null); // safely reset state
    } finally {
      setIsContesting(false);
    }
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (contestTimeoutRef.current) {
        clearTimeout(contestTimeoutRef.current);
      }
    };
  }, []);

  // States for dynamic feedback on pass turn
  const [showPassIndicator, setShowPassIndicator] = useState(false);
  const [passedPlayerName, setPassedPlayerName] = useState("");

  // States for letter limit validation error
  const [letterValidationError, setLetterValidationError] = useState<string | null>(null);

  const handlePassTurn = () => {
    const currentPlayer = players[activePlayerIndex]?.name || `Joueur ${activePlayerIndex + 1}`;
    setPassedPlayerName(currentPlayer);
    setShowPassIndicator(true);
    
    // Call Context to submit "PASSER" move with 0 points
    submitWord(activePlayerIndex, "PASSER", 0, "-", "Tour passé (0 point)");
    
    // Reset inputs
    setWord("");
    setCoords("");
    setAdjustment(0);
  };

  useEffect(() => {
    if (showPassIndicator) {
      const timer = setTimeout(() => {
        setShowPassIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showPassIndicator]);

  useEffect(() => {
    if (letterValidationError) {
      const timer = setTimeout(() => {
        setLetterValidationError(null);
      }, 7000); // 7 seconds so users can read the detailed explanation
      return () => clearTimeout(timer);
    }
  }, [letterValidationError]);

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim(); // Keep case for jokers (lowercase)!
    const cleanCoords = coords.trim().toUpperCase();
    if (!cleanWord || !cleanCoords) return;

    if (cleanWord.includes("*")) {
      setLetterValidationError("Veuillez remplacer l'astérisque '*' par la lettre correspondante en minuscule (ex: maRdi) pour indiquer la lettre que remplace votre Joker.");
      return;
    }

    // Validate French Scrabble letter counts
    const fullCoords = `${cleanCoords}${direction}`;
    const validation = validateLetterLimits(cleanWord, fullCoords, board);
    if (!validation.isValid) {
      setLetterValidationError(validation.errorMsg || "Limite de lettres dépassée !");
      return; // Block submission immediately
    }

    let score = 0;
    let breakdownVal = "";

    try {
      const result = calculateScore(cleanWord, fullCoords, board);
      if (result) {
        score = result.total;
        breakdownVal = result.breakdown;
      }
    } catch (e) {
      // ignore
    }

    const finalScore = score + adjustment;
    if (breakdownVal && adjustment !== 0) {
      breakdownVal = `${breakdownVal} (Ajustement: ${adjustment > 0 ? "+" : ""}${adjustment})`;
    } else if (adjustment !== 0) {
      breakdownVal = `Ajustement arbitre: ${adjustment > 0 ? "+" : ""}${adjustment}`;
    }

    submitWord(activePlayerIndex, cleanWord, finalScore, fullCoords, breakdownVal);

    // Reset inputs
    setWord("");
    setCoords("");
    setAdjustment(0);
  };

  // Selection states for starting next match
  const [p1Selection, setP1Selection] = useState("");
  const [p2Selection, setP2Selection] = useState("");
  
  // Track if winner stays in final match workflow
  const [winnerStays, setWinnerStays] = useState<boolean | null>(null);

  // Load default selections based on registered list
  useEffect(() => {
    if (registeredPlayers.length >= 2) {
      if (!p1Selection || !registeredPlayers.includes(p1Selection)) {
        setP1Selection(registeredPlayers[0]);
      }
      if (!p2Selection || !registeredPlayers.includes(p2Selection) || p2Selection === p1Selection) {
        const remaining = registeredPlayers.filter(p => p !== p1Selection);
        setP2Selection(remaining[0] || "");
      }
    }
  }, [registeredPlayers, p1Selection]);

  // Adjust Player 2 selection automatically when Player 1 is changed to prevent selection duplication
  const handleP1Change = (name: string) => {
    setP1Selection(name);
    if (name === p2Selection) {
      const filtered = registeredPlayers.filter(p => p !== name);
      if (filtered.length > 0) {
        setP2Selection(filtered[0]);
      }
    }
  };

  const handleCellClick = (row: number, col: number) => {
    // Convert 0-indexed row/col to Scrabble coordinates (e.g., A-O for cols, 1-15 for rows)
    const colLetter = String.fromCharCode(65 + col);
    const rowNumber = row + 1;
    const clickedCoord = `${colLetter}${rowNumber}`;

    if (!coords) {
      // Step 2: Set first cell as reference
      setCoords(clickedCoord);
    } else if (coords === clickedCoord) {
      // Fast cancellation – click again to remove highlight
      setCoords("");
    } else {
      // Step 3: Tactile alignment check with second cell
      const prevColLetter = coords.charAt(0);
      const prevRowNumber = parseInt(coords.slice(1));

      if (rowNumber === prevRowNumber) {
        // Same row -> Horizontal direction automatically detected
        setDirection("H");
      } else if (colLetter === prevColLetter) {
        // Same column -> Vertical direction automatically detected
        setDirection("V");
      } else {
        // Not aligned -> Update reference to the new cell clicked
        setCoords(clickedCoord);
      }
    }
  };

  const handleLaunchMatch = (e: React.FormEvent) => {
    e.preventDefault();
    let player1 = p1Selection;
    let player2 = p2Selection;

    if (finishedMatch && winnerStays === true) {
      player1 = finishedMatch.winnerName;
    }

    if (!player1 || !player2) {
      alert("Veuillez sélectionner les deux joueurs !");
      return;
    }

    if (player1 === player2) {
      alert("Veuillez choisir deux joueurs différents !");
      return;
    }

    startNewMatch(player1, player2);
    // Reset local state
    setWinnerStays(null);
  };

  // Render match creation / pairing menu
  const renderPairingSetup = () => {
    if (registeredPlayers.length < 2) {
      return (
        <div className={`p-6 rounded-2xl border text-center space-y-4 max-w-xl mx-auto ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`} id="no-players-fallback">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base font-display">Pas assez de joueurs</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Il faut au moins deux joueurs inscrits pour configurer et lancer un match de Scrabble.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/gestion-joueurs"
              id="goto-register-ink"
              className="py-2.5 px-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl text-xs font-display hover:scale-[1.01] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-orange-500/15"
            >
              Inscrire des joueurs 👑
            </Link>
          </div>
        </div>
      );
    }

    // Case 1: Match was completed and we have a winner choice to make
    if (finishedMatch) {
      if (finishedMatch.isDraw) {
        const { p1Name, p2Name, p1Score, p2Score } = finishedMatch;
        return (
          <div className="space-y-6 max-w-xl mx-auto" id="completed-match-draw-workflow">
            {/* Draw recap banner */}
            <div className="relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br from-blue-500/10 via-slate-500/5 to-transparent border-blue-500/30 text-center space-y-3 shadow-md shadow-blue-500/5 animate-fade-in" id="match-draw-banner">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-widest block">Fin de Route (Match Nul)</span>
                <h3 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                  🤝 MATCH NUL !
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Pas de vainqueur pour ce match de parité.
                </p>
                <p className="text-xs font-mono text-slate-300 pt-1.5 font-semibold">
                  {p1Name || "Joueur 1"} et {p2Name || "Joueur 2"} se séparent sur le score de <span className="text-amber-400">{p1Score} pts</span> partout.
                </p>
              </div>
            </div>

            {/* Replay option container */}
            <div className={`p-6 rounded-2xl border space-y-5 text-center ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`} id="draw-selection-container">
              <div className="space-y-1">
                <h4 className="font-bold text-sm font-display text-slate-200">
                  Que voulez-vous faire ?
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  Le match n'ayant pas de vainqueur, vous pouvez choisir de le rejouer ou de continuer en sélectionnant d'autres joueurs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    startNewMatch(p1Name || "Joueur 1", p2Name || "Joueur 2");
                  }}
                  className={`p-4 rounded-xl border font-bold text-xs font-display flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] ${
                    theme === "dark" 
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" 
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-sm"
                  }`}
                >
                  <RefreshCw className="h-5 w-5 animate-spin-slow text-emerald-500" />
                  <span className="text-center">🔄 OUI, REJOUER LE MATCH</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFinishedMatch(null);
                  }}
                  className={`p-4 rounded-xl border font-bold text-xs font-display flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] ${
                    theme === "dark" 
                      ? "border-slate-800 bg-slate-850 text-slate-300 hover:bg-slate-800" 
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 shadow-sm"
                  }`}
                >
                  <Users className="h-5 w-5 text-slate-400" />
                  <span className="text-center">👥 NON, NOUVEAUX JOUEURS</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      const { winnerName, winnerScore, loserName, loserScore } = finishedMatch;

      return (
        <div className="space-y-6 max-w-xl mx-auto" id="completed-match-workflow">
          {/* Winner recap banner */}
          <div className="relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30 text-center space-y-3 shadow-md shadow-amber-500/5 animate-fade-in" id="match-winner-banner">
            <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-mono font-bold tracking-widest border border-amber-500/20">
              SÉRIE: {kingStreak} 🔥
            </div>
            
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/23 text-amber-500 flex items-center justify-center animate-pulse">
              <Crown className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">Victoire Confirmée</span>
              <h3 className="text-xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                🏆 {winnerName}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                A remporté le duel face à {loserName} par {winnerScore} à {loserScore} points.
              </p>
            </div>
          </div>

          {/* Winner choice form */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
          }`} id="winner-selection-container">
            <h4 className="font-bold text-sm text-center font-display pb-2 border-b border-slate-500/10">
              Que fait le vainqueur ({winnerName}) ?
            </h4>

            {winnerStays === null ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  id="winner-stays-btn"
                  onClick={() => {
                    setWinnerStays(true);
                    // Filter list to grab first participant who is not winner to populate default player 2 selection
                    const firstOption = registeredPlayers.find(p => p !== winnerName) || "";
                    setP2Selection(firstOption);
                  }}
                  className={`p-4 rounded-xl border font-bold text-xs font-display flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] ${
                    theme === "dark" 
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10" 
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <Crown className="h-5 w-5 fill-current" />
                  <span className="text-center">Le vainqueur RESTE</span>
                </button>

                <button
                  type="button"
                  id="winner-leaves-btn"
                  onClick={() => {
                    setWinnerStays(false);
                    // Default selection of player 1 and player 2 from first two registered lists
                    if (registeredPlayers.length >= 2) {
                      setP1Selection(registeredPlayers[0]);
                      setP2Selection(registeredPlayers[1]);
                    }
                  }}
                  className={`p-4 rounded-xl border font-bold text-xs font-display flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] ${
                    theme === "dark" 
                      ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10" 
                      : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                  }`}
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-center">Le vainqueur SORT</span>
                </button>
              </div>
            ) : (
              /* If winnerStays selection is decided, render the pairing selection form */
              <form onSubmit={handleLaunchMatch} className="space-y-4 pt-1" id="pairing-selection-form">
                {winnerStays ? (
                  /* Winner staying workflow - we only select Challenger 2 */
                  <div className="space-y-3.5">
                    <div className="p-3 rounded-xl border border-slate-500/10 bg-slate-500/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-bold">👑 Table conservée par :</span>
                      <span className="font-extrabold text-emerald-500">{winnerName}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-500 uppercase">Choisir le Joueur 2 (Défiant)</label>
                      <select
                        value={p2Selection}
                        onChange={(e) => setP2Selection(e.target.value)}
                        className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${
                          theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        id="player-2-defier-select"
                      >
                        <option value="" disabled>-- Sélectionner un défiant --</option>
                        {registeredPlayers
                          .filter(p => p !== winnerName)
                          .map(player => (
                            <option key={player} value={player}>{player}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Winner leaving workflow - choose both players */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-500 uppercase">Choisir le Joueur 1</label>
                      <select
                        value={p1Selection}
                        onChange={(e) => handleP1Change(e.target.value)}
                        className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${
                          theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        id="player-1-fresh-select"
                      >
                        {registeredPlayers.map(player => (
                          <option key={player} value={player}>{player}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-500 uppercase">Choisir le Joueur 2</label>
                      <select
                        value={p2Selection}
                        onChange={(e) => setP2Selection(e.target.value)}
                        className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${
                          theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        id="player-2-fresh-select"
                      >
                        {registeredPlayers
                          .filter(p => p !== p1Selection)
                          .map(player => (
                            <option key={player} value={player}>{player}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setWinnerStays(null)}
                    className={`flex-1 py-3 px-4 font-semibold text-xs font-display rounded-xl border transition-all cursor-pointer ${
                      theme === "dark" 
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-200 hover:bg-slate-100 text-slate-600"
                    }`}
                    id="back-winner-choice-btn"
                  >
                    Retour
                  </button>

                  <button
                    type="submit"
                    className="flex-[2] py-3 px-4 font-bold text-xs font-display tracking-wide uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-[1.01] text-white shadow-md shadow-orange-500/15"
                    id="submit-pairing-button"
                  >
                    <Play className="h-4 w-4 animate-pulse" />
                    Lancer le Match 🏆
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    // Case 2: Standard fresh matchup state when no game has been played yet
    return (
      <div className="space-y-6 max-w-xl mx-auto animate-fade-in" id="fresh-matchup-setup">
        <div className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${
          theme === "dark" ? "bg-slate-900/80 border-slate-800 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-500/10 animate-pulse">
            <Trophy className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="font-bold font-display text-sm">Nouveau Match</h3>
          </div>

          <form onSubmit={handleLaunchMatch} className="space-y-4" id="standard-pairing-form">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase">Sélectionner Joueur 1</label>
              <select
                value={p1Selection}
                onChange={(e) => handleP1Change(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${
                  theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
                id="p1-select-box"
              >
                {registeredPlayers.map(player => (
                  <option key={player} value={player}>{player}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase">Sélectionner Joueur 2</label>
              <select
                value={p2Selection}
                onChange={(e) => setP2Selection(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${
                  theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
                id="p2-select-box"
              >
                {registeredPlayers
                  .filter(p => p !== p1Selection)
                  .map(player => (
                    <option key={player} value={player}>{player}</option>
                  ))
                }
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 font-bold max-sm:text-xs font-display tracking-widest uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-[1.01] text-white shadow-md shadow-orange-500/15"
                id="launch-matchup-submit"
              >
                <Play className="h-4.5 w-4.5" />
                Démarrer le Match 🏁
              </button>
            </div>
          </form>
        </div>

        <div className={`p-4 rounded-xl border flex gap-2 w-full text-xs ${
          theme === "dark" ? "bg-slate-950 border-slate-850 text-slate-500" : "bg-slate-100/50 border-slate-150 text-slate-500"
        }`}>
          <HelpIcon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p>Choisissez les deux joueurs de la table, puis validez le match. Les scores du vainqueur seront historisés dans les annales à la fin de la séance.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in mb-8" id="match-page-canvas">
      {/* Toast Notification for Pass Turn - visually stunning banner */}
      <AnimatePresence>
        {showPassIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-xl shadow-xl border flex items-center gap-3 ${
              theme === "dark"
                ? "bg-slate-900/95 border-blue-500/30 text-blue-100 shadow-blue-950/50"
                : "bg-blue-50/98 border-blue-200 text-blue-900 shadow-blue-500/10"
            }`}>
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
                <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-xs font-display uppercase tracking-wider text-blue-500">
                  Tour Passé ! 🚷
                </p>
                <p className="text-xs font-medium truncate opacity-90 leading-normal">
                  Score de <strong>{passedPlayerName}</strong> enregistré à <span className="font-mono text-[11px]">0 pt</span>.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification for Letter Counts - visually stunning warning banner */}
      <AnimatePresence>
        {letterValidationError && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 text-center"
          >
            <div className={`p-4 rounded-xl shadow-xl border flex gap-3.5 relative overflow-hidden ${
              theme === "dark"
                ? "bg-slate-900/96 border-rose-500/30 text-rose-100 shadow-rose-955"
                : "bg-rose-50 border-rose-200 text-rose-950 shadow-rose-500/10"
            }`}>
              {/* Decorative accent edge */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-amber-500" />
              
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-500 shrink-0 self-start">
                <AlertCircle className="h-5.5 w-5.5" />
              </div>

              <div className="flex-1 min-w-0 space-y-1 text-left">
                <p className="font-black text-xs font-display uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  ⚠️ Limite de lettres atteinte !
                </p>
                <p className="text-xs font-medium leading-relaxed font-mono whitespace-pre-wrap">
                  {letterValidationError}
                </p>
              </div>

              {/* Close button */}
              <button 
                onClick={() => setLetterValidationError(null)}
                className="text-xs font-mono font-bold opacity-50 hover:opacity-100 transition-opacity absolute right-3 top-3 px-1.5 py-0.5 bg-slate-500/10 hover:bg-slate-500/20 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex items-center justify-between" id="match-page-header">
        <Link
          to="/"
          id="back-home-button-match"
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            theme === "dark" 
              ? "border-slate-800 text-slate-300 hover:bg-slate-900 bg-slate-950" 
              : "border-slate-200 text-slate-705 hover:bg-slate-100 bg-white shadow-sm"
          }`}
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>

        {isMatchStarted && (
          <button
            onClick={finishCurrentMatch}
            id="finish-match-direct-button"
            className="py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-orange-500 hover:scale-[1.01] text-white shadow-md shadow-red-500/15"
            title="Saisir la fin de partie et désigner le vainqueur"
          >
            <Crown className="h-4 w-4" />
            Terminer le Match 🏁
          </button>
        )}
      </div>

      {!isMatchStarted ? (
        renderPairingSetup()
      ) : (
        /* Active playing screen layout - optimized and perfectly centered */
        <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto items-stretch" id="active-play-root">
          
          {/* Top: ScoreBoard */}
          <div className="w-full">
            <ScoreBoard />
          </div>

          {/* Middle: Centered 15x15 Interactive digital Board */}
          <div className="flex flex-col items-center justify-center w-full px-1 sm:px-2 gap-2" id="board-container-wrapper">
            
            {/* Extremely compact title */}
            <div className="flex items-center gap-1.5 px-0.5 justify-center mt-1">
              <LayoutGrid className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <h3 className="font-bold font-display text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">Plateau Scrabble Digital</h3>
            </div>

            {(() => {
              const previewBoard = board.map(row => [...row]);
              const cleanWord = word.trim(); // Keep case for jokers (lowercase)!
              const cleanCoords = coords.trim().toUpperCase();
              let finalPreviewScore: number | null = null;
              if (cleanWord && cleanCoords && cleanCoords.length >= 2) {
                const match = cleanCoords.match(/^([A-O])([0-9]{1,2})$/);
                if (match) {
                  const colLetter = match[1];
                  const rowNum = parseInt(match[2]);
                  let col = colLetter.charCodeAt(0) - 65;
                  let row = rowNum - 1;
                  
                  for (let i = 0; i < cleanWord.length; i++) {
                    if (row >= 0 && row < 15 && col >= 0 && col < 15) {
                      if (!previewBoard[row][col]) {
                        previewBoard[row][col] = `preview:${cleanWord[i]}`;
                      }
                    }
                    if (direction === "H") {
                      col++;
                    } else {
                      row++;
                    }
                  }

                  try {
                    const fullCoords = `${cleanCoords}${direction}`;
                    const result = calculateScore(cleanWord, fullCoords, board);
                    if (result && result.total > 0) {
                      finalPreviewScore = result.total + adjustment;
                    } else if (adjustment !== 0) {
                      finalPreviewScore = adjustment;
                    }
                  } catch (e) {
                    if (adjustment !== 0) {
                      finalPreviewScore = adjustment;
                    }
                  }
                }
              }
              return (
                <div className="space-y-4 w-full">
                  <AnimatePresence mode="wait">
                    {contestState && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden w-full mb-2"
                      >
                        {contestState.isPending ? (
                          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-amber-500/5 animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
                                <RefreshCw className="h-5 w-5 animate-spin" />
                              </div>
                              <div>
                                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#cc8d39] block leading-none mb-1">ARBITRAGE EN DIRECT</span>
                                <h4 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                                  Vérification de coup contesté...
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                  Mot en cours d'examen : <span className="font-extrabold text-amber-500">"{contestState.word}"</span> ({contestState.coordinates})
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 py-1 px-2.5 rounded-full self-start sm:self-auto font-black shrink-0 uppercase tracking-wider">
                              Vérification ODS9 🔍
                            </span>
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border ${
                            contestState.verdict === "valid"
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 shadow-md shadow-emerald-500/5"
                              : "border-rose-500/30 bg-rose-500/5 text-rose-500 shadow-md shadow-rose-500/5"
                          } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                contestState.verdict === "valid"
                                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-500"
                                  : "bg-rose-500/10 border border-rose-500/25 text-rose-500"
                              }`}>
                                {contestState.verdict === "valid" ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <Activity className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <span className={`text-[10px] font-mono font-extrabold uppercase tracking-widest block leading-none mb-1 ${
                                  contestState.verdict === "valid" ? "text-emerald-500" : "text-rose-500"
                                }`}>VERDICT ARBITRAL</span>
                                <h4 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                                  {contestState.verdict === "valid" ? "✅ Coup validé !" : "❌ Coup rejeté !"}
                                </h4>
                                <p className="text-xs text-slate-550 dark:text-slate-400 font-mono mt-0.5">
                                  Le mot <span className={`font-extrabold uppercase ${
                                    contestState.verdict === "valid" ? "text-emerald-500" : "text-rose-500"
                                  }`}>"{contestState.word}"</span> est jugé {contestState.verdict === "valid" ? "correct et validé par ODS9." : "incorrect et annulé !"}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] sm:text-xs font-mono py-1 px-3 rounded-full self-start sm:self-auto font-black uppercase tracking-wider shrink-0 ${
                              contestState.verdict === "valid"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/15"
                            }`}>
                              {contestState.verdict === "valid" ? "COUP VALIDE" : "REJETÉ"}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Board 
                    board={previewBoard} 
                    onCellClick={handleCellClick} 
                    selectedCoords={coords} 
                    previewScore={finalPreviewScore}
                    previewWord={cleanWord}
                    contestedHighlights={contestedHighlights}
                  />

                  {/* Champ de saisie mot et bouton de validation juste en dessous du plateau */}
                  <form onSubmit={handleSubmitWord} className="pt-3 border-t border-slate-500/10 space-y-1.5 text-left">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block px-1">
                      Mot :
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z*]/g, ""))}
                        placeholder="Ex: maRdi"
                        className={`flex-1 p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1.5 focus:ring-amber-500/40 font-display tracking-wide font-semibold text-center ${
                          theme === "dark"
                            ? "bg-slate-950 border-slate-850 text-white placeholder-slate-700"
                            : "bg-slate-105 border-slate-200 text-slate-950 placeholder-slate-400"
                        }`}
                        required
                      />
                      <button
                        type="submit"
                        disabled={!word.trim() || !coords.trim()}
                        className={`py-2.5 px-6 font-bold font-display text-xs tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase shrink-0 ${
                          word.trim() && coords.trim()
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/15 hover:scale-[1.01]"
                            : "bg-slate-300 dark:bg-slate-850 text-slate-500 dark:text-slate-600 cursor-not-allowed opacity-50"
                        }`}
                      >
                        VALIDER ⚡
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-[11px] px-1 text-slate-500/90 leading-tight">
                      💡 Pour jouer un <strong>Joker</strong>, saisissez son caractère en <strong>minuscule</strong> (ex : <code>maRdi</code> pour un Joker remplaçant la lettre R).
                    </p>
                  </form>
                </div>
              );
            })()}
          </div>
 
          {/* Section: Actions (Passer / Contester) repositioned exactly between Board & MoveForm */}
          <div className="w-full max-w-[500px] mx-auto px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pass Turn Button */}
              <motion.button
                type="button"
                onClick={handlePassTurn}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`py-3.5 px-4 font-black font-display text-xs tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 uppercase border shadow-sm ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 hover:bg-slate-755 text-slate-100"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                }`}
              >
                <RefreshCw className="h-4 w-4 animate-spin-slow text-slate-400" />
                PASSER LE TOUR (+0) 🚷
              </motion.button>

              {/* Contest Word Button */}
              <motion.button
                type="button"
                disabled={!lastContestableEntry || isContesting}
                onClick={() => setShowContestConfirm(true)}
                whileHover={lastContestableEntry && !isContesting ? { scale: 1.01 } : {}}
                whileTap={lastContestableEntry && !isContesting ? { scale: 0.98 } : {}}
                className={`py-3.5 px-4 font-black font-display text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 uppercase border shadow-md ${
                  lastContestableEntry && !isContesting
                    ? theme === "dark"
                      ? "bg-orange-600/95 border-orange-500 hover:bg-orange-550 text-white cursor-pointer shadow-orange-950/20 animate-pulse"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 border-orange-400 hover:opacity-95 text-white cursor-pointer shadow-orange-550/10"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40"
                }`}
                title={
                  lastContestableEntry
                    ? `Contester le mot "${lastContestableEntry.word}" joué par ${lastContestableEntry.playerName}`
                    : "Aucun mot jouable disponible à la contestation"
                }
              >
                {isContesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />
                )}
                {isContesting 
                  ? "Analyse..." 
                  : lastContestableEntry 
                    ? `Contester "${lastContestableEntry.word}" ⚠️` 
                    : "Contester ⚠️"}
              </motion.button>
            </div>
          </div>

          {/* Bottom: Word input and referee reference form */}
          <div className="w-full max-w-[500px] mx-auto">
            <MoveForm 
              word={word}
              setWord={setWord}
              coords={coords}
              setCoords={setCoords}
              direction={direction}
              setDirection={setDirection}
              adjustment={adjustment}
              setAdjustment={setAdjustment}
            />
          </div>

          {/* History Container */}
          <div className="w-full max-w-[500px] mx-auto space-y-3">
            <div className="flex items-center gap-2 px-1">
              <LayoutGrid className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold font-display text-xs tracking-wider uppercase opacity-70">
                Historique des coups
              </h3>
            </div>
            <MoveHistory />
          </div>

        </div>
      )}

      {/* Contest Confirmation Modal */}
      <AnimatePresence>
        {showContestConfirm && lastContestableEntry && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border text-center space-y-4 relative overflow-hidden ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-850 text-slate-100 shadow-slate-950"
                  : "bg-white border-slate-200 text-slate-800 shadow-slate-100"
              }`}
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-500 animate-pulse">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                  Demande de confirmation
                </span>
                <h3 className="text-lg font-black font-display uppercase tracking-wide text-slate-800 dark:text-slate-100">
                  Contester le mot ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Vous vous apprêtez à contester le mot <span className="text-amber-500 font-extrabold font-mono">"{lastContestableEntry.word}"</span> joué par <span className="font-bold text-slate-700 dark:text-slate-200">{lastContestableEntry.playerName}</span>.
                </p>

                <div className="text-left bg-slate-500/5 dark:bg-black/20 p-3.5 rounded-xl border border-dashed border-slate-500/15 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400 leading-normal">
                  <p className="font-bold text-slate-600 dark:text-slate-350">Règles de la contestation :</p>
                  <p className="flex items-start gap-1">
                    <span className="text-emerald-500 font-bold">✔</span>
                    <span><strong>Succès :</strong> Le mot est retiré de la grille (0 point) et vous recevez un bonus de <strong>+10 points</strong> au prochain coup.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="text-rose-500 font-bold">❌</span>
                    <span><strong>Échec :</strong> Le mot est validé et votre prochain tour est automatiquement <strong>passé (pénalité)</strong>.</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContestConfirm(false)}
                  className={`py-2.5 px-4 font-bold text-xs tracking-wider rounded-xl cursor-pointer transition-all uppercase border ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmContest}
                  className="py-2.5 px-4 font-bold text-xs tracking-wider rounded-xl cursor-pointer transition-all uppercase bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white shadow-md shadow-orange-500/25"
                >
                  Oui, contester ⚠️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
