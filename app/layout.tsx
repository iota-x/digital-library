import type { Metadata } from "next";
import { Playfair_Display, Caveat, Lato } from "next/font/google";
import Navbar          from "@/components/Navbar";
import ScrollToTop     from "@/components/ScrollToTop";
import CommandPalette  from "@/components/CommandPalette";
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
  title: "3 Months of Us 💗",
  description: "made with way too much love",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${caveat.variable} ${lato.variable}`}>
        <ScrollToTop />
        <Navbar />
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}