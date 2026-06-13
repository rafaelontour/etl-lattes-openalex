"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Info } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import { api, Sugestao } from "@/lib/api";

interface SearchBarProps {
  initialQuery?: string;
  initialTipo?: string;
  initialLivre?: boolean;
  variant?: "home" | "inline";
}

export default function SearchBar({
  initialQuery = "",
  initialTipo = "pesquisador",
  initialLivre = false,
  variant = "inline",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [tipo, setTipo] = useState(initialTipo);
  const [livre, setLivre] = useState(initialLivre);
  const [showFilters, setShowFilters] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [sugestoesLoading, setSugestoesLoading] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [sugestaoIndex, setSugestaoIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchSugestoes = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSugestoes([]);
      setShowSugestoes(false);
      return;
    }
    setSugestoesLoading(true);
    try {
      const results = await api.busca.sugestoes(q, tipo);
      setSugestoes(results);
      setShowSugestoes(results.length > 0);
      setSugestaoIndex(-1);
    } catch {
      setSugestoes([]);
      setShowSugestoes(false);
    } finally {
      setSugestoesLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSugestoes(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSugestoes]);

  const selectSugestao = (s: Sugestao) => {
    setQuery(s.texto);
    setShowSugestoes(false);
    submitQuery(s.texto);
  };

  const submitQuery = (q: string) => {
    if (!q.trim()) return;

    if (livre) {
      router.push(`/busca?q=${encodeURIComponent(q)}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("q", q);
    const target =
      tipo === "pesquisador"
        ? `/pesquisadores?${params}`
        : tipo === "producao"
          ? `/producoes?${params}`
          : `/areas?${params}`;
    router.push(target);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (sugestaoIndex >= 0 && sugestoes[sugestaoIndex]) {
      selectSugestao(sugestoes[sugestaoIndex]);
      return;
    }
    submitQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSugestoes) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSugestaoIndex((prev) => (prev < sugestoes.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSugestaoIndex((prev) => (prev > 0 ? prev - 1 : sugestoes.length - 1));
    } else if (e.key === "Escape") {
      setShowSugestoes(false);
      setSugestaoIndex(-1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (showSugestoes === false && e.target.value.length >= 2) {
      setShowSugestoes(true);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSugestoes([]);
    setShowSugestoes(false);
    inputRef.current?.focus();
  };

  const isHome = variant === "home";

  return (
    <form onSubmit={handleSubmit} className={`w-full ${isHome ? "max-w-2xl" : "max-w-xl"} relative`}>
      <div
        className={`relative flex items-center rounded-xl border border-zinc-300 bg-white shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900 ${
          isHome ? "h-16 text-lg" : "h-12 text-base"
        }`}
      >
        <div className="flex h-full items-center pl-4 pr-2 text-zinc-400">
          <Search className={`${isHome ? "h-6 w-6" : "h-5 w-5"}`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (sugestoes.length > 0) setShowSugestoes(true); }}
          onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
          placeholder={
            tipo === "pesquisador"
              ? "Buscar por nome do pesquisador..."
              : tipo === "producao"
                ? "Buscar por título do artigo..."
                : "Buscar por área de atuação..."
          }
          className="h-full flex-1 bg-transparent outline-none text-zinc-900 placeholder-zinc-400 dark:text-zinc-100"
        />
        {sugestoesLoading && (
          <div className="pr-2 text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        )}
        {query && !sugestoesLoading && (
          <button type="button" onClick={handleClear} className="pr-2 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        )}
        {!isHome && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`mr-2 rounded-lg p-1.5 transition-colors ${
              showFilters ? "bg-blue-100 text-blue-600" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSugestoes && sugestoes.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {sugestoes.map((s, i) => (
            <li
              key={`${s.tipo}-${s.texto}`}
              onMouseDown={() => selectSugestao(s)}
              className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                i === sugestaoIndex
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-xs font-medium uppercase text-zinc-400">
                {s.tipo === "pesquisador" ? "P" : s.tipo === "producao" ? "A" : "Á"}
              </span>
              <span className="truncate">{s.texto}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Filters */}
      <div className={`mt-3 flex flex-wrap items-center gap-3 ${isHome ? "justify-center" : ""}`}>
        {!livre && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
            {[
              { value: "pesquisador", label: "Pesquisador" },
              { value: "producao", label: "Artigo" },
              { value: "area", label: "Área" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTipo(opt.value);
                  setSugestoes([]);
                  setShowSugestoes(false);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  tipo === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={livre}
            onChange={() => setLivre(!livre)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          Pesquisa livre
          <Tooltip content="Escreva naturalmente, do seu jeito. Exemplo: em vez de buscar por &quot;inteligência artificial na educação&quot;, você pode buscar &quot;Liste os trabalhos relacionados com arboviroses&quot; — o sistema entende o contexto e encontra produções relacionadas.">
            <Info className="ml-0.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          </Tooltip>
        </label>

        <button
          type="submit"
          className={`rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 ${
            isHome ? "py-2 text-sm" : ""
          }`}
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
