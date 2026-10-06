import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Pixelify_Sans, Press_Start_2P } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// Press Start 2P: the iconic arcade face, used only for the logo and big moments (too wide for reading).
const display = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-display" });
// Pixelify Sans: a pixel face that stays readable at button/label sizes.
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel" });
// Atkinson Hyperlegible: body copy, built for legibility, which matters on phones.
const sans = Atkinson_Hyperlegible({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Bey X Workshop", template: "%s · Bey X Workshop" },
  description: "Combo Lab, collection tracker and Bey Finder for Beyblade X.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ead2" },
    { media: "(prefers-color-scheme: dark)", color: "#120f24" },
  ],
};

// Applies the saved theme (or the OS preference) before paint, so there's no flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}`;

const NAV = [
  { href: "/lab", label: "Lab" },
  { href: "/finder", label: "Finder" },
  { href: "/collections", label: "Collections" },
  { href: "/parts", label: "Parts" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${pixel.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-40 bg-background border-b-4 border-foreground">
          <div className="mx-auto max-w-6xl px-4 py-2 sm:h-14 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/" className="font-display text-[11px] sm:text-xs leading-tight shrink-0">
              BEY<span className="text-primary">X</span>
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> </span>WORKSHOP
            </Link>
            <nav className="font-pixel flex justify-between sm:justify-end gap-1 sm:gap-3 text-base sm:text-lg order-last sm:order-none w-full sm:w-auto sm:ml-auto">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="px-1.5 py-1 hover:bg-accent hover:text-accent-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto sm:ml-0">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t-4 border-foreground mt-8">
          <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Part data and images from{" "}
              <a className="underline" href="https://beyblade.wiki" target="_blank" rel="noreferrer">
                beyblade.wiki
              </a>
              .
            </span>
            <span>Beyblade is a trademark of Takara Tomy. Fan project, not affiliated.</span>
            <Link className="underline" href="/scoring">
              How scoring works
            </Link>
            <Link className="underline" href="/about">
              About
            </Link>
            <Link className="underline" href="/admin">
              Admin
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
