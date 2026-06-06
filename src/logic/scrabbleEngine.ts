// French Scrabble Letter Values
export const FRENCH_LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 10,
  L: 1, M: 2, N: 1, O: 1, P: 3, Q: 8, R: 1, S: 1, T: 1, U: 1, V: 4,
  W: 10, X: 10, Y: 10, Z: 10, "*": 0 // '*' represents blank/joker
};

export function getLetterValue(letter: string): number {
  if (!letter) return 0;
  const isJoker = letter === letter.toLowerCase() && letter !== letter.toUpperCase();
  if (isJoker) return 0;
  return FRENCH_LETTER_VALUES[letter.toUpperCase()] || 0;
}

export type PremiumType = "NORMAL" | "TWS" | "DWS" | "TLS" | "DLS" | "CENTER";

// Coordinate parser
export interface ParsedCoordinate {
  row: number;
  col: number;
  direction: "H" | "V";
}

export function parseCoordinates(coordStr: string): ParsedCoordinate | null {
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

// Scrabble multiplier types (0-indexed 15x15)
export function getPremiumCellType(row: number, col: number): PremiumType {
  if (row === 7 && col === 7) return "CENTER";

  // Triple Word (TWS)
  const twsCoords = [
    [0, 0], [0, 7], [0, 14],
    [7, 0],         [7, 14],
    [14, 0], [14, 7], [14, 14]
  ];
  if (twsCoords.some(([r, c]) => r === row && c === col)) return "TWS";

  // Double Word (DWS)
  const dwsCoords = [
    [1, 1], [2, 2], [3, 3], [4, 4],
    [10, 10], [11, 11], [12, 12], [13, 13],
    [1, 13], [2, 12], [3, 11], [4, 10],
    [10, 4], [11, 3], [12, 2], [13, 1]
  ];
  if (dwsCoords.some(([r, c]) => r === row && c === col)) return "DWS";

  // Triple Letter (TLS)
  const tlsCoords = [
    [1, 5], [1, 9],
    [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13],
    [13, 5], [13, 9]
  ];
  if (tlsCoords.some(([r, c]) => r === row && c === col)) return "TLS";

  // Double Letter (DLS)
  const dlsCoords = [
    [0, 3], [0, 11],
    [2, 6], [2, 8],
    [3, 0], [3, 7], [3, 14],
    [6, 2], [6, 6], [6, 8], [6, 12],
    [7, 3], [7, 11],
    [8, 2], [8, 6], [8, 8], [8, 12],
    [11, 0], [11, 7], [11, 14],
    [12, 6], [12, 8],
    [14, 3], [14, 11]
  ];
  if (dlsCoords.some(([r, c]) => r === row && c === col)) return "DLS";

  return "NORMAL";
}

interface PlayedTileInfo {
  letter: string;
  row: number;
  col: number;
  isNew: boolean;
  value: number;
}

interface CrossingWordResult {
  word: string;
  score: number;
  breakdown: string;
}

/**
 * Calculates current word points automatically based on existing board letters and multiplier rules.
 * Supports professional Scrabble rules including horizontal/vertical "mots d'appui" / linking cross words.
 */
export function calculateScore(
  word: string,
  coordinates: string,
  currentBoard: string[][]
): {
  total: number;
  breakdown: string;
  lettersUsedCount: number;
} {
  const parsed = parseCoordinates(coordinates);
  if (!parsed) return { total: 0, breakdown: "Coordonnées invalides", lettersUsedCount: 0 };

  const { row: startRow, col: startCol, direction } = parsed;
  const cleanWord = word.trim(); // Preserve case for Joker detection!
  if (!cleanWord) return { total: 0, breakdown: "Mot vide", lettersUsedCount: 0 };

  // Handling SINGLE LETTER placement (Official Rules)
  if (cleanWord.length === 1) {
    const row = startRow;
    const col = startCol;

    // Check if cell is empty
    if (currentBoard[row][col] !== "") {
      return { total: 0, breakdown: "La case est déjà occupée", lettersUsedCount: 0 };
    }

    const singleLetter = cleanWord;
    const singleLetterVal = getLetterValue(singleLetter);
    const premium = getPremiumCellType(row, col);

    // Apply letter multiplier on the single letter
    let letterMult = 1;
    if (premium === "DLS") letterMult = 2;
    else if (premium === "TLS") letterMult = 3;
    const singleLetterScore = singleLetterVal * letterMult;

    // Word multipliers
    let wordMult = 1;
    if (premium === "DWS" || premium === "CENTER") wordMult = 2;
    else if (premium === "TWS") wordMult = 3;

    // 1. HORIZONTAL WORD Search (letters left + singleLetter + letters right)
    const leftLetters: { letter: string; val: number }[] = [];
    let currC = col - 1;
    while (currC >= 0 && currentBoard[row][currC] !== "") {
      const bLetter = currentBoard[row][currC];
      leftLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
      currC--;
    }
    leftLetters.reverse();

    const rightLetters: { letter: string; val: number }[] = [];
    let currC2 = col + 1;
    while (currC2 < 15 && currentBoard[row][currC2] !== "") {
      const bLetter = currentBoard[row][currC2];
      rightLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
      currC2++;
    }

    const horizLength = leftLetters.length + 1 + rightLetters.length;
    let horizWord = "";
    let horizScore = 0;
    let horizBreakdown = "";

    if (horizLength >= 2) {
      horizWord = [...leftLetters.map(l => l.letter), singleLetter, ...rightLetters.map(l => l.letter)].join("").toUpperCase();
      
      const letterParts: string[] = [];
      leftLetters.forEach(l => letterParts.push(`${l.letter}(${l.val})`));
      
      if (letterMult > 1) {
        letterParts.push(`${singleLetter}(${singleLetterVal}x${letterMult}=${singleLetterScore})`);
      } else {
        letterParts.push(`${singleLetter}(${singleLetterVal})`);
      }
      
      rightLetters.forEach(l => letterParts.push(`${l.letter}(${l.val})`));

      const baseSum = leftLetters.reduce((sum, l) => sum + l.val, 0) + singleLetterScore + rightLetters.reduce((sum, l) => sum + l.val, 0);
      horizScore = baseSum * wordMult;

      let bld = letterParts.join(" + ");
      if (wordMult > 1) {
        bld = `(${bld}) x ${wordMult} [=${horizScore}]`;
      } else {
        bld = `${bld} [=${horizScore}]`;
      }
      horizBreakdown = bld;
    }

    // 2. VERTICAL WORD Search (letters above + singleLetter + letters below)
    const upLetters: { letter: string; val: number }[] = [];
    let currR = row - 1;
    while (currR >= 0 && currentBoard[currR][col] !== "") {
      const bLetter = currentBoard[currR][col];
      upLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
      currR--;
    }
    upLetters.reverse();

    const downLetters: { letter: string; val: number }[] = [];
    let currR2 = row + 1;
    while (currR2 < 15 && currentBoard[currR2][col] !== "") {
      const bLetter = currentBoard[currR2][col];
      downLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
      currR2++;
    }

    const vertLength = upLetters.length + 1 + downLetters.length;
    let vertWord = "";
    let vertScore = 0;
    let vertBreakdown = "";

    if (vertLength >= 2) {
      vertWord = [...upLetters.map(l => l.letter), singleLetter, ...downLetters.map(l => l.letter)].join("").toUpperCase();
      
      const letterParts: string[] = [];
      upLetters.forEach(l => letterParts.push(`${l.letter}(${l.val})`));
      
      if (letterMult > 1) {
        letterParts.push(`${singleLetter}(${singleLetterVal}x${letterMult}=${singleLetterScore})`);
      } else {
        letterParts.push(`${singleLetter}(${singleLetterVal})`);
      }
      
      downLetters.forEach(l => letterParts.push(`${l.letter}(${l.val})`));

      const baseSum = upLetters.reduce((sum, l) => sum + l.val, 0) + singleLetterScore + downLetters.reduce((sum, l) => sum + l.val, 0);
      vertScore = baseSum * wordMult;

      let bld = letterParts.join(" + ");
      if (wordMult > 1) {
        bld = `(${bld}) x ${wordMult} [=${vertScore}]`;
      } else {
        bld = `${bld} [=${vertScore}]`;
      }
      vertBreakdown = bld;
    }

    // Check connection restriction unless the board is completely empty (first move)
    let isBoardEmpty = true;
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (currentBoard[r][c] !== "") {
          isBoardEmpty = false;
          break;
        }
      }
    }

    if (!isBoardEmpty && horizLength < 2 && vertLength < 2) {
      return { total: 0, breakdown: "La lettre doit être connectée aux lettres déjà présentes du plateau", lettersUsedCount: 0 };
    }

    if (horizLength < 2 && vertLength < 2) {
      return { total: 0, breakdown: "La pose d'une seule lettre doit former au moins un mot de longueur >= 2", lettersUsedCount: 0 };
    }

    const total = horizScore + vertScore;
    
    let finalBreakdown = `Pose d'une seule lettre '${singleLetter.toUpperCase()}' : `;
    if (horizWord && vertWord) {
      finalBreakdown += `Mots formés : ${horizWord} (${horizBreakdown}) + ${vertWord} (${vertBreakdown})`;
    } else if (horizWord) {
      finalBreakdown += `Mot formé : ${horizWord} (${horizBreakdown})`;
    } else {
      finalBreakdown += `Mot formé : ${vertWord} (${vertBreakdown})`;
    }

    return {
      total,
      breakdown: finalBreakdown,
      lettersUsedCount: 1
    };
  }

  const tilesInfo: PlayedTileInfo[] = [];
  let r = startRow;
  let c = startCol;

  for (let i = 0; i < cleanWord.length; i++) {
    const letter = cleanWord[i];
    if (r >= 15 || c >= 15 || r < 0 || c < 0) {
      break;
    }

    const existingLetter = currentBoard[r][c];
    const isNew = existingLetter === "";
    const value = getLetterValue(letter);

    tilesInfo.push({
      letter,
      row: r,
      col: c,
      isNew,
      value
    });

    if (direction === "H") {
      c++;
    } else {
      r++;
    }
  }

  if (tilesInfo.length === 0) {
    return { total: 0, breakdown: "Mot vide ou hors limite", lettersUsedCount: 0 };
  }

  // 1. Calculate Primary Word Score
  let primaryLetterSum = 0;
  let primaryWordMultiplier = 1;
  let lettersUsedCount = 0;
  const primaryBreakdownParts: string[] = [];

  for (const tile of tilesInfo) {
    if (tile.isNew) {
      lettersUsedCount++;
      const premium = getPremiumCellType(tile.row, tile.col);
      
      let letterMult = 1;
      if (premium === "DLS") letterMult = 2;
      else if (premium === "TLS") letterMult = 3;

      const tileScore = tile.value * letterMult;
      primaryLetterSum += tileScore;

      if (letterMult > 1) {
        primaryBreakdownParts.push(`${tile.letter.toUpperCase()}(${tile.value}x${letterMult}=${tileScore})`);
      } else {
        primaryBreakdownParts.push(`${tile.letter.toUpperCase()}(${tile.value})`);
      }

      if (premium === "DWS" || premium === "CENTER") {
        primaryWordMultiplier *= 2;
      } else if (premium === "TWS") {
        primaryWordMultiplier *= 3;
      }
    } else {
      // Already on the board
      primaryLetterSum += tile.value;
      primaryBreakdownParts.push(`${tile.letter.toUpperCase()}(${tile.value})`);
    }
  }

  const primaryScore = primaryLetterSum * primaryWordMultiplier;
  let primaryBreakdownStr = primaryBreakdownParts.join(" + ");
  if (primaryWordMultiplier > 1) {
    primaryBreakdownStr = `(${primaryBreakdownStr}) x ${primaryWordMultiplier} [=${primaryScore}]`;
  } else {
    primaryBreakdownStr = `${primaryBreakdownStr} [=${primaryScore}]`;
  }

  // If no new tiles are placed, that's an invalid move
  if (lettersUsedCount === 0) {
    return { total: 0, breakdown: "Aucune nouvelle tuile posée sur le plateau", lettersUsedCount: 0 };
  }

  // 2. Discover and score all perpendicular/crossing words (mots d'appui)
  const crossingWords: CrossingWordResult[] = [];

  for (const tile of tilesInfo) {
    // Perpendicular words are only generated by newly placed tiles
    if (!tile.isNew) continue;

    if (direction === "H") {
      // Check vertical crossing words (up and down)
      const upLetters: { letter: string; val: number }[] = [];
      let currR = tile.row - 1;
      while (currR >= 0 && currentBoard[currR][tile.col] !== "") {
        const bLetter = currentBoard[currR][tile.col];
        upLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
        currR--;
      }
      upLetters.reverse();

      const downLetters: { letter: string; val: number }[] = [];
      let currR2 = tile.row + 1;
      while (currR2 < 15 && currentBoard[currR2][tile.col] !== "") {
        const bLetter = currentBoard[currR2][tile.col];
        downLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
        currR2++;
      }

      const totalLength = upLetters.length + 1 + downLetters.length;
      if (totalLength >= 2) {
        const wordStr = [...upLetters.map(l => l.letter), tile.letter, ...downLetters.map(l => l.letter)].join("").toUpperCase();
        
        const premium = getPremiumCellType(tile.row, tile.col);
        let letterMult = 1;
        if (premium === "DLS") letterMult = 2;
        else if (premium === "TLS") letterMult = 3;

        const mainTileScore = tile.value * letterMult;
        const otherScore = [...upLetters, ...downLetters].reduce((sum, l) => sum + l.val, 0);

        let wordMult = 1;
        if (premium === "DWS" || premium === "CENTER") wordMult = 2;
        else if (premium === "TWS") wordMult = 3;

        const score = (mainTileScore + otherScore) * wordMult;

        // Breakdown presentation
        const parts: string[] = [];
        upLetters.forEach(l => parts.push(`${l.letter.toUpperCase()}(${l.val})`));
        if (letterMult > 1) {
          parts.push(`${tile.letter.toUpperCase()}(${tile.value}x${letterMult}=${mainTileScore})`);
        } else {
          parts.push(`${tile.letter.toUpperCase()}(${tile.value})`);
        }
        downLetters.forEach(l => parts.push(`${l.letter.toUpperCase()}(${l.val})`));

        let bld = parts.join(" + ");
        if (wordMult > 1) {
          bld = `(${bld}) x ${wordMult} [=${score}]`;
        } else {
          bld = `${bld} [=${score}]`;
        }

        crossingWords.push({ word: wordStr, score, breakdown: bld });
      }
    } else {
      // Check horizontal crossing words (left and right)
      const leftLetters: { letter: string; val: number }[] = [];
      let currC = tile.col - 1;
      while (currC >= 0 && currentBoard[tile.row][currC] !== "") {
        const bLetter = currentBoard[tile.row][currC];
        leftLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
        currC--;
      }
      leftLetters.reverse();

      const rightLetters: { letter: string; val: number }[] = [];
      let currC2 = tile.col + 1;
      while (currC2 < 15 && currentBoard[tile.row][currC2] !== "") {
        const bLetter = currentBoard[tile.row][currC2];
        rightLetters.push({ letter: bLetter, val: getLetterValue(bLetter) });
        currC2++;
      }

      const totalLength = leftLetters.length + 1 + rightLetters.length;
      if (totalLength >= 2) {
        const wordStr = [...leftLetters.map(l => l.letter), tile.letter, ...rightLetters.map(l => l.letter)].join("").toUpperCase();

        const premium = getPremiumCellType(tile.row, tile.col);
        let letterMult = 1;
        if (premium === "DLS") letterMult = 2;
        else if (premium === "TLS") letterMult = 3;

        const mainTileScore = tile.value * letterMult;
        const otherScore = [...leftLetters, ...rightLetters].reduce((sum, l) => sum + l.val, 0);

        let wordMult = 1;
        if (premium === "DWS" || premium === "CENTER") wordMult = 2;
        else if (premium === "TWS") wordMult = 3;

        const score = (mainTileScore + otherScore) * wordMult;

        // Breakdown presentation
        const parts: string[] = [];
        leftLetters.forEach(l => parts.push(`${l.letter.toUpperCase()}(${l.val})`));
        if (letterMult > 1) {
          parts.push(`${tile.letter.toUpperCase()}(${tile.value}x${letterMult}=${mainTileScore})`);
        } else {
          parts.push(`${tile.letter.toUpperCase()}(${tile.value})`);
        }
        rightLetters.forEach(l => parts.push(`${l.letter.toUpperCase()}(${l.val})`));

        let bld = parts.join(" + ");
        if (wordMult > 1) {
          bld = `(${bld}) x ${wordMult} [=${score}]`;
        } else {
          bld = `${bld} [=${score}]`;
        }

        crossingWords.push({ word: wordStr, score, breakdown: bld });
      }
    }
  }

  // 3. Sum up total points
  const totalCrossingScore = crossingWords.reduce((sum, cw) => sum + cw.score, 0);
  let total = primaryScore + totalCrossingScore;

  // Standard Scrabble Bonus (+50 points for placing exactly 7 letters)
  let hasScrabbleBonus = false;
  if (lettersUsedCount === 7) {
    total += 50;
    hasScrabbleBonus = true;
  }

  // 4. Construct final verbose breakdown expression
  let finalBreakdown = `${cleanWord.toUpperCase()} : ${primaryBreakdownStr}`;
  if (crossingWords.length > 0) {
    const cwBreakdowns = crossingWords.map(cw => `${cw.word} (${cw.breakdown})`).join(", ");
    finalBreakdown += ` + [Mots d'appui : ${cwBreakdowns}]`;
  }
  if (hasScrabbleBonus) {
    finalBreakdown += ` + Scrabble Bonus 🚀 (+50)`;
  }

  return {
    total,
    breakdown: finalBreakdown,
    lettersUsedCount
  };
}

/**
 * Discovers and returns all words (main + all crosswords) formed by placing a word.
 * Expects the state of the board BEFORE this word was placed.
 */
export interface FormedWord {
  word: string;
  cells: { row: number; col: number }[];
}

export function getFormedWords(
  word: string,
  coordinates: string,
  currentBoard: string[][]
): FormedWord[] {
  const parsed = parseCoordinates(coordinates);
  if (!parsed) return [];

  const { row: startRow, col: startCol, direction } = parsed;
  const cleanWord = word.trim().toUpperCase();
  if (!cleanWord) return [];

  const formedObj: FormedWord[] = [];

  // Single letter played
  if (cleanWord.length === 1) {
    const row = startRow;
    const col = startCol;
    const singleLetter = cleanWord;

    // Horizontal check
    const leftLetters: string[] = [];
    let currC = col - 1;
    while (currC >= 0 && currentBoard[row][currC] !== "") {
      leftLetters.push(currentBoard[row][currC]);
      currC--;
    }
    leftLetters.reverse();

    const rightLetters: string[] = [];
    let currC2 = col + 1;
    while (currC2 < 15 && currentBoard[row][currC2] !== "") {
      rightLetters.push(currentBoard[row][currC2]);
      currC2++;
    }

    const horizLength = leftLetters.length + 1 + rightLetters.length;
    if (horizLength >= 2) {
      const fullWord = [...leftLetters, singleLetter, ...rightLetters].join("");
      const cells: { row: number; col: number }[] = [];
      for (let c = col - leftLetters.length; c <= col + rightLetters.length; c++) {
        cells.push({ row, col: c });
      }
      formedObj.push({ word: fullWord, cells });
    }

    // Vertical check
    const upLetters: string[] = [];
    let currR = row - 1;
    while (currR >= 0 && currentBoard[currR][col] !== "") {
      upLetters.push(currentBoard[currR][col]);
      currR--;
    }
    upLetters.reverse();

    const downLetters: string[] = [];
    let currR2 = row + 1;
    while (currR2 < 15 && currentBoard[currR2][col] !== "") {
      downLetters.push(currentBoard[currR2][col]);
      currR2++;
    }

    const vertLength = upLetters.length + 1 + downLetters.length;
    if (vertLength >= 2) {
      const fullWord = [...upLetters, singleLetter, ...downLetters].join("");
      const cells: { row: number; col: number }[] = [];
      for (let r = row - upLetters.length; r <= row + downLetters.length; r++) {
        cells.push({ row: r, col });
      }
      formedObj.push({ word: fullWord, cells });
    }

    // If no crossword was formed, even a single letter technically forms a 1-letter word
    if (formedObj.length === 0) {
      formedObj.push({ word: cleanWord, cells: [{ row, col }] });
    }

    return formedObj;
  }

  // Multi-letter played
  // 1. Main word itself
  const mainCells: { row: number; col: number }[] = [];
  for (let i = 0; i < cleanWord.length; i++) {
    const r = direction === "H" ? startRow : startRow + i;
    const c = direction === "H" ? startCol + i : startCol;
    mainCells.push({ row: r, col: c });
  }
  formedObj.push({ word: cleanWord, cells: mainCells });

  // 2. Crossing words
  let r = startRow;
  let c = startCol;

  for (let i = 0; i < cleanWord.length; i++) {
    const letter = cleanWord[i];
    if (r >= 15 || c >= 15 || r < 0 || c < 0) {
      break;
    }

    const existingLetter = currentBoard[r][c];
    const isNew = existingLetter === "";

    if (isNew) {
      if (direction === "H") {
        const upLetters: string[] = [];
        let currR = r - 1;
        while (currR >= 0 && currentBoard[currR][c] !== "") {
          upLetters.push(currentBoard[currR][c]);
          currR--;
        }
        upLetters.reverse();

        const downLetters: string[] = [];
        let currR2 = r + 1;
        while (currR2 < 15 && currentBoard[currR2][c] !== "") {
          downLetters.push(currentBoard[currR2][c]);
          currR2++;
        }

        if (upLetters.length + 1 + downLetters.length >= 2) {
          const fullWord = [...upLetters, letter, ...downLetters].join("");
          const cells: { row: number; col: number }[] = [];
          for (let y = r - upLetters.length; y <= r + downLetters.length; y++) {
            cells.push({ row: y, col: c });
          }
          formedObj.push({ word: fullWord, cells });
        }
      } else {
        const leftLetters: string[] = [];
        let currC = c - 1;
        while (currC >= 0 && currentBoard[r][currC] !== "") {
          leftLetters.push(currentBoard[r][currC]);
          currC--;
        }
        leftLetters.reverse();

        const rightLetters: string[] = [];
        let currC2 = c + 1;
        while (currC2 < 15 && currentBoard[r][currC2] !== "") {
          rightLetters.push(currentBoard[r][currC2]);
          currC2++;
        }

        if (leftLetters.length + 1 + rightLetters.length >= 2) {
          const fullWord = [...leftLetters, letter, ...rightLetters].join("");
          const cells: { row: number; col: number }[] = [];
          for (let x = c - leftLetters.length; x <= c + rightLetters.length; x++) {
            cells.push({ row: r, col: x });
          }
          formedObj.push({ word: fullWord, cells });
        }
      }
    }

    if (direction === "H") {
      c++;
    } else {
      r++;
    }
  }

  return formedObj;
}

export const FRENCH_LETTER_LIMITS: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8, J: 1, K: 1,
  L: 5, M: 3, N: 6, O: 6, P: 2, Q: 1, R: 6, S: 6, T: 6, U: 6, V: 2,
  W: 1, X: 1, Y: 1, Z: 1
};

export interface LetterValidationResult {
  isValid: boolean;
  errorMsg?: string;
}

export function validateLetterLimits(
  word: string,
  coordinates: string,
  currentBoard: string[][]
): LetterValidationResult {
  const cleanWord = word.trim(); // Keep case for Joker/blank tile validation!
  const parsed = parseCoordinates(coordinates);
  if (!cleanWord || !parsed) {
    return { isValid: true };
  }

  // 1. Calculate how many of each letter are ALREADY on the board
  const boardCounts: Record<string, number> = {};
  let boardJokerCount = 0;

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const char = currentBoard[r][c];
      if (char) {
        const isJoker = char === char.toLowerCase() && char !== char.toUpperCase();
        if (isJoker || char === "*") {
          boardJokerCount++;
        } else {
          const charUpper = char.toUpperCase();
          if (charUpper >= "A" && charUpper <= "Z") {
            boardCounts[charUpper] = (boardCounts[charUpper] || 0) + 1;
          }
        }
      }
    }
  }

  // 2. Determine how many NEW letters this proposed move will add to the board
  const newCounts: Record<string, number> = { ...boardCounts };
  let newJokerCount = boardJokerCount;
  let { row, col, direction } = parsed;

  for (let i = 0; i < cleanWord.length; i++) {
    if (row >= 15 || col >= 15 || row < 0 || col < 0) {
      break;
    }
    const existing = currentBoard[row][col];
    // If the space is empty, we are placing a NEW tile
    if (!existing) {
      const char = cleanWord[i];
      const isJoker = char === char.toLowerCase() && char !== char.toUpperCase();
      if (isJoker || char === "*") {
        newJokerCount++;
      } else {
        const charUpper = char.toUpperCase();
        if (charUpper >= "A" && charUpper <= "Z") {
          newCounts[charUpper] = (newCounts[charUpper] || 0) + 1;
        }
      }
    }
    if (direction === "H") {
      col++;
    } else {
      row++;
    }
  }

  // 3. Compare standard letters against limits
  for (const letter of Object.keys(FRENCH_LETTER_LIMITS)) {
    const currentCount = newCounts[letter] || 0;
    const limit = FRENCH_LETTER_LIMITS[letter];
    if (currentCount > limit) {
      return {
        isValid: false,
        errorMsg: `La limite pour la lettre '${letter}' est de ${limit} jeton(s) dans le Scrabble français. Le plateau en contient déjà ${boardCounts[letter] || 0}, et ce coup demande d'ajouter ${currentCount - (boardCounts[letter] || 0)} jeton(s) '${letter}' supplémentaire(s), ce qui dépasse la réserve physique autorisée.`
      };
    }
  }

  // 4. Check total jokers limit
  if (newJokerCount > 2) {
    return {
      isValid: false,
      errorMsg: `Le nombre maximum de Jokers (blancs) autorisés dans un jeu de Scrabble français est de 2. Le plateau contient déjà ${boardJokerCount} Joker(s), et ce coup demande de placer du/des Joker(s) supplémentaire(s) pour un total de ${newJokerCount}.`
    };
  }

  return { isValid: true };
}
