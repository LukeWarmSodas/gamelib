import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
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
  title: "GameLib",
  description: "Self-hosted game library frontend for NAS storage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/[0.035] blur-[100px]" />
          <div className="absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full bg-violet-500/[0.04] blur-[90px]" />
        </div>
        <SiteHeader />
        <div className="relative flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
