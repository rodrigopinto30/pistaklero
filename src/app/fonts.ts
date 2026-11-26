import { Geist, Geist_Mono } from "next/font/google";

// Fuentes compartidas por el layout y por global-not-found (que no pasa por el layout).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
