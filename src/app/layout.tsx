import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Cinzel,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { db } from "@/lib/db";
import { getCached, setCached } from "@/lib/cache";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

// Distinct display fonts for the school name: engraved "academia" capitals on
// the login screen, a clean geometric face in the sidebar corner.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Tab title/description follow the admin-configurable school name (Settings →
// Branding). Reuses the same 30s cache key as /api/settings so it costs no
// extra queries in practice. Falls back to the default name if the DB is
// unavailable or the row doesn't exist yet.
export async function generateMetadata(): Promise<Metadata> {
  const DEFAULT_NAME = "School Name";
  let name = DEFAULT_NAME;
  let tagline = "A modern School Information Management System (SIMS) for students, teachers, and administrators. Manage students, staff, grades, attendance, fees, messaging, and more.";
  try {
    const key = "settings:singleton";
    let row = getCached<{ name?: string; tagline?: string }>(key);
    if (!row) {
      row = await db.schoolSettings.findUnique({
        where: { id: "singleton" },
        select: { name: true, tagline: true },
      });
      if (row) setCached(key, row, 30_000);
    }
    if (row?.name) name = row.name;
    if (row?.tagline) tagline = row.tagline;
  } catch {
    // DB not ready / missing table — keep defaults.
  }
  return {
    title: `${name} | SIMS — School Information Management System`,
    description: tagline,
    keywords: ["school management", "SIMS", "school information management system", "education", "students", "teachers", "grades", "attendance", name],
    authors: [{ name }],
    icons: {
      icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    },
  };
}

// Inline script to set theme before paint (avoids flash of wrong theme)
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('edu-theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes like data-gr-ext-installed onto <body> before React
          hydrates. This silences mismatches for the body element itself only. */}
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${cinzel.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <style>{`font-family: var(--font-geist-sans), system-ui, sans-serif;`}</style>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
