"use client";

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Switch light/dark theme"
      className="font-pixel px-2 py-1 px-box-flat text-sm shrink-0 px-press"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        try {
          localStorage.setItem("theme", dark ? "dark" : "light");
        } catch {
          // Private mode: theme just won't persist.
        }
      }}
    >
      <span className="dark:hidden">☾</span>
      <span className="hidden dark:inline">☀</span>
    </button>
  );
}
