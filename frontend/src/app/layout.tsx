import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lattes Analytics",
  description: "Consulta e busca semântica de produções acadêmicas (Lattes + OpenAlex)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gradient-to-br from-sky-50 via-white to-indigo-50 font-sans text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
