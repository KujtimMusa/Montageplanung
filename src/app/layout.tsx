import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Anbieter } from "@/components/providers";

const schrift = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Monteurplanung",
    template: "%s | Monteurplanung",
  },
  description: "Montageplanung für Teams — Mobile-First",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
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
