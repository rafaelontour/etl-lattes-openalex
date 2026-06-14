"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, BookOpen, Grid3X3, BarChart3 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Busca", icon: Search },
  { href: "/pesquisadores", label: "Pesquisadores", icon: Users },
  { href: "/producoes", label: "Artigos", icon: BookOpen },
  { href: "/areas", label: "Áreas", icon: Grid3X3 },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-sky-200 bg-white/90 backdrop-blur-md shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
          <BarChart3 className="h-5 w-5 text-sky-600" />
          <span className="hidden sm:inline">Lattes Analytics</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                    : "text-zinc-600 hover:bg-sky-50 hover:text-sky-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
