import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MANU Protocol — Radio Communication Sector (Blue Zone)",
  description: "RF telemetry and communication recovery terminal for Sanctuary Zero.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#040813] text-[#d8e7ff] min-h-screen">
        {children}
      </body>
    </html>
  );
}
