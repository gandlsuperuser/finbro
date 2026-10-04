import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-doc", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinBro — AR Financial Report Reader",
  description:
    "Point your iPad at a printed 10-K or 10-Q. FinBro overlays AR insights and explains any number you circle with Apple Pencil.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FinBro" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050608",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} ${serif.variable} antialiased`}>{children}</body>
    </html>
  );
}
