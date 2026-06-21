import type { Metadata } from "next";
import { Playfair_Display, Caveat, Lato } from "next/font/google";
import Navbar          from "@/components/Navbar";
import ScrollToTop     from "@/components/ScrollToTop";
import ScrollProgress  from "@/components/ScrollProgress";
import PageTransition  from "@/components/PageTransition";
import CommandPalette  from "@/components/CommandPalette";
import SwipeNav        from "@/components/SwipeNav";
import PwaRegister     from "@/components/PwaRegister";
import DarkOverlay     from "@/components/DarkOverlay";
import AppShell        from "@/components/AppShell";
import MotionRoot     from "@/components/MotionRoot";
import MobileTabBar   from "@/components/MobileTabBar";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToasterProvider } from "@/components/Toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "600"],
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "600"],
});
const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Us 💗",
  description: "made with way too much love",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#be185d",
};

// Runs before first paint to apply the saved theme + custom accent, killing the
// flash where the page rendered in the default pink theme until /api/auth/me
// resolved client-side. Reads the same localStorage keys ThemeProvider writes.
// NOTE: a custom accent (ann_accent_vars) must NOT also apply a built-in theme
// class — the theme-X classes hardcode section/nav backgrounds that override the
// accent's CSS variables. So when an accent is cached, skip the theme class.
const THEME_BOOTSTRAP = `(function(){try{var a=localStorage.getItem('ann_accent_vars');var t=localStorage.getItem('ann_color_theme');if(t&&t!=='pink'&&!a)document.documentElement.classList.add('theme-'+t);if(a){var m=JSON.parse(a);for(var k in m)document.documentElement.style.setProperty(k,m[k]);}if(localStorage.getItem('ann_reduce_motion')==='1')document.documentElement.classList.add('reduce-motion');if(localStorage.getItem('ann_hide_ambient')==='1')document.documentElement.classList.add('no-ambient');var fp=localStorage.getItem('ann_font_pairing');if(fp&&fp!=='romantic')document.documentElement.classList.add('font-'+fp);if(localStorage.getItem('ann_immersive')==='1')document.documentElement.classList.add('immersive');var pbg=localStorage.getItem('ann_page_bg');if(pbg){document.documentElement.classList.add('custom-bg');document.documentElement.style.setProperty('--page-bg-image',pbg);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the bootstrap script mutates <html> class/style
    // before hydration, which is expected and must not warn.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className={`${playfair.variable} ${caveat.variable} ${lato.variable}`}>
        <MotionRoot>
          <ToasterProvider>
            <ConfirmProvider>
              <DarkOverlay />
              <AppShell />
              <ScrollToTop />
              <ScrollProgress />
              <Navbar />
              <CommandPalette />
              <SwipeNav />
              <PwaRegister />
              <MobileTabBar />
              {/* Keyboard skip link — visually hidden until focused */}
              <a href="#main" className="skip-link">skip to content</a>
              <div id="main"><PageTransition>{children}</PageTransition></div>
              <Analytics />
              <SpeedInsights />
            </ConfirmProvider>
          </ToasterProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
