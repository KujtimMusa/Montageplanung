import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Anbieter } from "@/components/providers";

const schrift = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Montageplanung",
    template: "%s | Montageplanung",
  },
  description:
    "Die smarte Einsatzplanung für Handwerksbetriebe — Kalender, Konflikte, KI.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vlerafy",
  },
  icons: {
    icon: "/icon.svg",
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#01696f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={cn("min-h-dvh font-sans antialiased", schrift.variable)}>
        <Anbieter>{children}</Anbieter>
      </body>
    </html>
  );
}
