import type { Metadata, Viewport } from "next";
import { Anonymous_Pro, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { WorkspaceProvider } from "@/lib/store";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = Anonymous_Pro({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-ap", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: "Upload your notes. ZtudyLock understands them, teaches you, tests you, finds what's weak and adapts. It doesn't just answer your questions; it helps you actually learn.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <div className="ambient" aria-hidden="true" />
        <WorkspaceProvider>{children}</WorkspaceProvider>
        <Toaster
          position="bottom-center"
          mobileOffset={{ bottom: 88 }}
          toastOptions={{
            style: {
              background: "rgb(18 18 20 / 0.85)",
              backdropFilter: "blur(20px)",
              color: "#f5f5f7",
              border: "1px solid rgb(255 255 255 / 0.1)",
              borderRadius: 999,
              fontSize: 13,
              padding: "12px 18px",
            },
          }}
        />
      </body>
    </html>
  );
}
