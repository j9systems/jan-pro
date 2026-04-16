import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jan-Pro QuoteBuilder",
  description: "Jan-Pro Franchise Development - Commercial Cleaning Quote Tool",
  manifest: "/manifest.json",
  themeColor: "#003087",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JAN-PRO QuoteBuilder",
  },
  icons: {
    apple: "https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1776309034/Untitled_design_5_ahmhjl.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <AppHeader />
            <main className="flex-1 bg-white">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
