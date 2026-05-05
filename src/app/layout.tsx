import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build In Public Tracker",
  description: "Build In Public Tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}