import type { Metadata } from "next";
import { clinic } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${clinic.name} — ${clinic.tagline}`,
    template: `%s · ${clinic.name}`,
  },
  description: clinic.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
