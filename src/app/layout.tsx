import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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

export const metadata: Metadata = {
  title: "EduCenterJM | Secondary School Management",
  description: "A modern secondary school management system for students, teachers, and administrators. Manage students, staff, grades, attendance, fees, messaging, and more.",
  keywords: ["school management", "education", "students", "teachers", "grades", "attendance", "EduCenterJM"],
  authors: [{ name: "EduCenterJM" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <style>{`font-family: var(--font-geist-sans), system-ui, sans-serif;`}</style>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
