import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const PixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Frogsy",
  description: "Frogsy is a platform for tracking your pain levels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${PixelFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
