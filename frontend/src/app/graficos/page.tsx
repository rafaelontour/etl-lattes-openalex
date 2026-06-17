"use client";

export default function GraficosPage() {
  return (
    <div className="flex flex-col rounded-xl border border-sky-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <iframe
        src="https://app.powerbi.com/view?r=eyJrIjoiMDg2NmUwYWQtNzUwZS00YTE0LWExY2QtMDJjZmQxYmUxOTMxIiwidCI6IjcyNjE3ZGQ4LTM3YTUtNDJhMi04YjIwLTU5ZDJkMGM1MDcwNyJ9"
        title="Gráficos Power BI"
        className="w-full h-full border-none flex-1 min-h-0"
        allowFullScreen
      />
    </div>
  );
}
