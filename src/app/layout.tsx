import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "inventious",
  description: "AI-powered social media creatives in under 10 minutes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;700&family=Inter:wght@400;600&family=Oswald:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .font-lora { font-family: 'Lora', Georgia, serif; }
          .font-cormorant { font-family: 'Cormorant Garamond', 'Times New Roman', serif; }
          .font-bebas { font-family: 'Bebas Neue', Impact, sans-serif; }
          .font-dm { font-family: 'DM Sans', Arial, sans-serif; }
          .font-oswald { font-family: 'Oswald', Impact, sans-serif; }
          .font-inter { font-family: 'Inter', Arial, sans-serif; }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
