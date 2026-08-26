import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const grotesk = localFont({
  src: "./fonts/OverusedGrotesk-VF.woff2",
  variable: "--font-grotesk",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monotone",
  description: "Tasks, Projects, Calendar, CRM & more — one shared workspace for your team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
