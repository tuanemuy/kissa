import type { Metadata } from "next";
import "@/styles/index.css";
import { Navigation } from "@/components/ui/mobile-navigation";

export const metadata: Metadata = {
  title: "Kissa",
  description: "地域の素晴らしい場所を発見・共有するプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Navigation />
        <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      </body>
    </html>
  );
}
