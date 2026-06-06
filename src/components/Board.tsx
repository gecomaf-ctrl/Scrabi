import React from "react";
import { useTheme } from "../context/ThemeContext";

interface BoardProps {
  board: string[][];
  onCellClick?: (row: number, col: number) => void;
  selectedCoords?: string;
  previewScore?: number | null;
  previewWord?: string;
  boardSize?: number;
  contestedHighlights?: Record<string, "green" | "red" | "pending" | null>;
}

// Scrabble multiplier types
export type PremiumCellType = "NORMAL" | "TWS" | "DWS" | "TLS" | "DLS" | "CENTER";

// French official letter values for Scrabble representation
const LETTER_SCORES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 10, L: 1, M: 2,
  N: 1, O: 1, P: 3, Q: 8, R: 1, S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10,
  "*": 0
};

// Determine the cell type based on Scrabble board symmetry coordinates (0-indexed 15x15)
export function getPremiumCellType(row: number, col: number): PremiumCellType {
  // Center
  if (row === 7 && col === 7) return "CENTER";

  // Triple Word (TWS) - Corners and midpoints (Red)
  const twsCoords = [
    [0, 0], [0, 7], [0, 14],
    [7, 0],         [7, 14],
    [14, 0], [14, 7], [14, 14]
  ];
  if (twsCoords.some(([r, c]) => r === row && c === col)) return "TWS";

  // Double Word (DWS) - Diagonals (Pink-Peach)
  const dwsCoords = [
    [1, 1], [2, 2], [3, 3], [4, 4],
    [10, 10], [11, 11], [12, 12], [13, 13],
    [1, 13], [2, 12], [3, 11], [4, 10],
    [10, 4], [11, 3], [12, 2], [13, 1]
  ];
  if (dwsCoords.some(([r, c]) => r === row && c === col)) return "DWS";

  // Triple Letter (TLS) - Symmetry (Dark Blue)
  const tlsCoords = [
    [1, 5], [1, 9],
    [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13],
    [13, 5], [13, 9]
  ];
  if (tlsCoords.some(([r, c]) => r === row && c === col)) return "TLS";

  // Double Letter (DLS) (Light Blue)
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

export default function Board({ 
  board, 
  onCellClick, 
  selectedCoords,
  previewScore,
  previewWord,
  boardSize,
  contestedHighlights
}: BoardProps) {
  const { theme } = useTheme();

  // Columns A-O, Rows 1-15
  const cols = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
  const rows = Array.from({ length: 15 }, (_, i) => i + 1);

  // Exact background and text colors mapping to the uploaded image
  const getCellStyles = (type: PremiumCellType) => {
    switch (type) {
      case "CENTER": // Peach/pink center star base
        return "bg-[#f29c84] text-[#631e13] border-[#caa054]/55 hover:bg-[#e68d75]";
      case "TWS": // Triple Word (Red)
        return "bg-[#eb2f37] text-white border-[#caa054]/55 hover:bg-[#d4232b]";
      case "DWS": // Double Word (Peach/Pink)
        return "bg-[#f49776] text-[#631e13] border-[#caa054]/55 hover:bg-[#e48c6b]";
      case "TLS": // Triple Letter (Dark Blue)
        return "bg-[#006eb2] text-white border-[#caa054]/55 hover:bg-[#005d96]";
      case "DLS": // Double Letter (Light Blue)
        return "bg-[#8fcef4] text-[#00396b] border-[#caa054]/55 hover:bg-[#7dbbe0]";
      default: // Normal Green Cell
        return "bg-[#0a4d3c] text-emerald-800/20 border-[#caa054]/40 hover:bg-[#084133]";
    }
  };

  const renderCellLabel = (type: PremiumCellType) => {
    const textStyle = "flex flex-col items-center justify-center leading-[1] tracking-tighter text-center scale-[1.02] h-full w-full select-none";
    switch (type) {
      case "CENTER":
        return (
          <span className="text-sm sm:text-base md:text-lg text-black font-black leading-none select-none drop-shadow-xs">
            ★
          </span>
        );
      case "TWS":
        return (
          <div className={`${textStyle} text-white font-sans text-[4px] xs:text-[5px] sm:text-[6.5px] md:text-[7.5px] font-black`}>
            <span>MOT</span>
            <span>COMPTE</span>
            <span>TRIPLE</span>
          </div>
        );
      case "DWS":
        return (
          <div className={`${textStyle} text-[#58150c] font-sans text-[4px] xs:text-[5px] sm:text-[6.5px] md:text-[7.5px] font-black`}>
            <span>MOT</span>
            <span>COMPTE</span>
            <span>DOUBLE</span>
          </div>
        );
      case "TLS":
        return (
          <div className={`${textStyle} text-white font-sans text-[4px] xs:text-[5px] sm:text-[6.5px] md:text-[7.5px] font-black`}>
            <span>LETTRE</span>
            <span>COMPTE</span>
            <span>TRIPLE</span>
          </div>
        );
      case "DLS":
        return (
          <div className={`${textStyle} text-[#002f5a] font-sans text-[4px] xs:text-[5px] sm:text-[6.5px] md:text-[7.5px] font-black`}>
            <span>LETTRE</span>
            <span>COMPTE</span>
            <span>DOUBLE</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full p-0">
      {/* 3D Mahogany Wood Frame */}
      <div 
        className="w-full rounded-2xl md:rounded-3xl p-1.5 sm:p-2 bg-gradient-to-br from-[#3d2010] via-[#241309] to-[#160c05] border-[6px] sm:border-[10px] md:border-[14px] border-[#29160a] shadow-xl md:shadow-2xl relative overflow-hidden"
        id="scrabble-wood-frame"
      >
        {/* Bevel lighting lines of the wooden frame */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/10 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-[1.5px] bg-white/5 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-black/40 pointer-events-none" />
        
        {/* Core Board area - Emerald/Green fabric style */}
        <div className="bg-[#05372b] p-1 sm:p-2 md:p-3 rounded-lg sm:rounded-xl shadow-inner relative z-5">
          
          {/* Top Header Labels (A-O) with classy copper/gold color */}
          <div className="flex w-full mb-1">
            <div className="w-4 sm:w-5 shrink-0 flex items-center justify-center font-bold text-[8px] text-transparent" />
            {cols.map((col) => (
              <div 
                key={col} 
                className="flex-1 text-center font-mono text-[8px] sm:text-[10px] md:text-[11px] uppercase font-bold text-[#dfcd9a] select-none flex items-center justify-center aspect-square"
              >
                {col}
              </div>
            ))}
          </div>

          {/* Board Grid Rows with very tight wire dividers */}
          <div className="flex flex-col gap-[1px] md:gap-[2px] w-full">
            {board.map((rowArr, rIdx) => (
              <div key={rIdx} className="flex gap-[1px] md:gap-[2px] w-full items-center">
                
                {/* Left Side Coordinates Labels (1-15) */}
                <div className="w-4 sm:w-5 shrink-0 font-mono text-[8px] sm:text-[10px] md:text-[11px] font-bold text-[#dfcd9a] text-right pr-1 sm:pr-1.5 aspect-square flex items-center justify-end select-none">
                  {rows[rIdx]}
                </div>

                {/* Grid Cells */}
                {rowArr.map((cellValue, cIdx) => {
                  const cellType = getPremiumCellType(rIdx, cIdx);
                  const isPreview = !!cellValue && cellValue.startsWith("preview:");
                  const displayValue = isPreview ? cellValue.replace("preview:", "") : cellValue;
                  const isPlaced = !!cellValue && !isPreview;
                  const cellCoord = `${cols[cIdx]}${rows[rIdx]}`;
                  const isSelected = selectedCoords === cellCoord;

                  const isContestedGreen = contestedHighlights && contestedHighlights[`${rIdx}-${cIdx}`] === "green";
                  const isContestedRed = contestedHighlights && contestedHighlights[`${rIdx}-${cIdx}`] === "red";
                  const isContestedPending = contestedHighlights && contestedHighlights[`${rIdx}-${cIdx}`] === "pending";

                  return (
                    <div
                      key={cIdx}
                      onClick={() => onCellClick?.(rIdx, cIdx)}
                      className={`flex-1 aspect-square rounded-[3px] border-[0.5px] md:border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative ${
                        isSelected
                          ? "ring-2 ring-amber-400 border-amber-400 bg-amber-500/25 scale-[1.08] z-10 animate-pulse shadow-md shadow-amber-500/30"
                          : isContestedPending
                            ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-b-[2.5px] border-r-[1.5px] border-amber-700 text-white font-black font-display shadow-lg ring-3 ring-amber-300 scale-[1.05] z-15 rounded-[4px] animate-pulse"
                            : isContestedGreen
                              ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 border-b-[2.5px] border-r-[1.5px] border-emerald-800 text-white font-black font-display shadow-lg ring-3 ring-emerald-400 scale-[1.05] z-15 rounded-[4px] animate-pulse"
                              : isContestedRed
                                ? "bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 border-b-[2.5px] border-r-[1.5px] border-rose-800 text-white font-black font-display shadow-lg ring-3 ring-rose-400 scale-[1.05] z-15 rounded-[4px]"
                                : isPlaced
                                  ? "bg-gradient-to-br from-[#ffdca1] via-[#fcd27a] to-[#dca138] border-b-[2.5px] border-r-[1.5px] border-[#7a4810] text-[#301c05] font-black font-display shadow-md scale-[1.03] z-5 rounded-[4px]"
                                  : isPreview
                                    ? "border-[1.5px] border-dashed border-amber-400 bg-amber-500/15 text-amber-500 font-bold z-5 scale-100 animate-pulse rounded-[4px]"
                                    : getCellStyles(cellType)
                      }`}
                      title={`${cols[cIdx]}${rows[rIdx]} - ${isPlaced ? "Tuile : " + displayValue : isPreview ? "Prévisualisation : " + displayValue : cellType}`}
                    >
                      {isPlaced || isPreview || isContestedGreen || isContestedRed || isContestedPending ? (() => {
                        const isCellJoker = !!displayValue && displayValue === displayValue.toLowerCase() && displayValue !== displayValue.toUpperCase();
                        const cellScore = isCellJoker ? 0 : LETTER_SCORES[displayValue.toUpperCase()];
                        return (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {/* Main letter */}
                            <span className={`text-[10px] sm:text-xs md:text-sm font-black leading-none tracking-tight font-display ${
                              (isContestedGreen || isContestedRed || isContestedPending)
                                ? "text-white"
                                : isCellJoker
                                  ? "text-rose-600 dark:text-rose-500 font-extrabold"
                                  : "text-[#382006]"
                            }`}>
                              {displayValue.toUpperCase()}
                            </span>
                            
                            {/* Letter point score Subscript in the bottom-right corner */}
                            {cellScore !== undefined && (
                              <span className={`absolute bottom-[0.5px] xs:bottom-[1px] right-[1.5px] xs:right-[2px] text-[5px] sm:text-[6px] md:text-[7.5px] font-bold select-none leading-none ${
                                (isContestedGreen || isContestedRed || isContestedPending)
                                  ? "text-white/80"
                                  : isCellJoker
                                    ? "text-rose-500 dark:text-rose-400 font-extrabold"
                                    : "text-[#4c3114]"
                              }`}>
                                {cellScore}
                              </span>
                            )}
                          </div>
                        );
                      })() : (
                        renderCellLabel(cellType)
                      )}

                      {/* Floating custom points bubble for score preview */}
                      {isSelected && previewWord && previewWord.length > 0 && previewScore !== null && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none select-none animate-bounce">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg shadow-black/30 border border-amber-300/40 whitespace-nowrap flex items-center gap-0.5">
                            <span>+{previewScore}</span>
                            <span className="text-[7px] sm:text-[8px] opacity-90 uppercase">AUTORISÉ</span>
                          </div>
                          {/* Little downward pointer triangle */}
                          <div className="w-1.5 h-1.5 bg-orange-500 rotate-45 -mt-[3px] border-r border-b border-amber-300/20" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
