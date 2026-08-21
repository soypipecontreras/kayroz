import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeScript from "./ThemeScript";
import RegisterSW from "./RegisterSW";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Kayroz",
  description: "Kayroz: la plataforma para que entrenadores personales y sus atletas lleven el entrenamiento en un solo lugar.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kayroz",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // cover: que el fondo pinte detrás del notch y la barra de gestos del
  // iPhone cuando la PWA corre standalone — sin esto quedan franjas blancas.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <ThemeScript />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
