import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Cinzel } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060b14",
};

const sans = Space_Grotesk({
  variable: "--next-sans",
  subsets: ["latin"],
});

const serif = Cinzel({
  variable: "--next-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memory of Us",
  description: "A 3D space for our memories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${serif.variable} antialiased bg-background text-foreground relative`}
      >
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
