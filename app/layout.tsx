import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechGeekStudio SEO Command Center",
  description:
    "AI-powered SEO audit, keyword research, backlink strategy, and content optimization platform by TechGeekStudio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${syne.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          offset={16}
          toastOptions={{
            style: {
              background: "#0D1117",
              border: "1px solid #1C2333",
              color: "#E2E8F0",
              zIndex: 99999,
            },
          }}
        />
      </body>
    </html>
  );
}
