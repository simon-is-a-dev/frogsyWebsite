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
  description: "Frogsy is a platform for tracking your pain levels .",
  keywords: ["pain tracking", "health", "wellness", "Frogsy", "pain diary"],
  authors: [{ name: "SoME Digital" }],
  creator: "SoME Digital",
  publisher: "Frogsy",
  
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://frogsy-website.vercel.app/",
    title: "Frogsy",
    description: "Frogsy is a platform for tracking your pain levels.",
    siteName: "Frogsy",
    images: [
      {
        url: "https://frogsy-website.vercel.app/frogsyMetaImg.png",
        width: 1200,
        height: 630,
        alt: "Frogsy - Pain Tracking Platform",
      },
    ],
  },

  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/favicon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/favicon.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registered:', registration))
                    .catch(err => console.log('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${PixelFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
