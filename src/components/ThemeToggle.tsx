import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-component-btn"
      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer font-medium text-xs font-display ${
        theme === "dark"
          ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400 shadow-md shadow-slate-950/40"
          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm"
      }`}
      title={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4 text-amber-500 animate-pulse" />
          <span className="hidden sm:inline">Mode Clair</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-slate-600" />
          <span className="hidden sm:inline">Mode Sombre</span>
        </>
      )}
    </button>
  );
}
