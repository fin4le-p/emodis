import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const siteUrl = new URL("https://emodis.nakano6.com");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl, // 絶対URL生成の基準
  title: "ディスコード絵文字ジェネレーター",
  description: "ディスコードなどで使う絵文字を作るツール！discord emoji generator.",
  // 検索サムネ最大化（Google）
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "ディスコード絵文字ジェネレーター",
    description: "ディスコードなどで使う絵文字を作るツール！discord emoji generator.",
    siteName: "emodis.nakano6.com",
    images: [
      {
        url: "/ogp.jpg", // metadataBase と結合されて絶対URLに
        width: 1200,
        height: 630,
        alt: "Discord 絵文字ジェネレーター",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ディスコード絵文字ジェネレーター",
    description: "ディスコードなどで使う絵文字を作るツール！discord emoji generator.",
    images: ["/twitter.jpg"], // 同じでもOK
  },
  icons: {
    icon: "/favicon.ico", // または app/icon.png を置けば自動
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* GA: gtag.js を非同期読み込み */}
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { send_page_view: false }); // ルーターでPV送るためfalse
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
