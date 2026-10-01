import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NodeWave Deliverable Platform | State-Aware Task Engine",
  description:
    "Mission-critical operational backbone for managing deliverables of high-value projects with state-based permissions, dependency enforcement, and optimistic locking.",
};

// Apply the persisted theme before hydration to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem("nodewave_theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static literal string, standard Next.js pattern to apply theme before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
