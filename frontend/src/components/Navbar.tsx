"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, BookOpen, Grid3X3, BarChart3 } from "lucide-react";

const links = [
  { href: "/", label: "Busca", icon: Search },
  { href: "/pesquisadores", label: "Pesquisadores", icon: Users },
  { href: "/producoes", label: "Artigos", icon: BookOpen },
  { href: "/areas", label: "Áreas", icon: Grid3X3 },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <BarChart3 className="h-5 w-5 text-blue-600" />
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
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
