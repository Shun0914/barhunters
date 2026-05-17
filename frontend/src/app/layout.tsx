import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { APP_FAVICON_PATH, APP_NAME } from "@/lib/appBranding";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "人的資本・挑戦活動の可視化・ポイント申請・因果ストーリー",
  icons: {
    icon: APP_FAVICON_PATH,
    apple: APP_FAVICON_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="min-h-screen bg-brand-bg-page font-sans text-ink-primary antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
