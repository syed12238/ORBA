import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightContextPanel } from "@/components/layout/RightContextPanel";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";

export const viewport: Viewport = {
  themeColor: "#060709",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "ORBA — Where conversations orbit people",
  description: "A production-grade real-time social platform with deterministic ranking, instant messaging, pulse notifications, community circles, and AI moderation.",
  keywords: ["ORBA", "Social Network", "Realtime", "Next.js", "AI Moderation", "Distributed Architecture"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-obsidian text-zinc-100 min-h-screen antialiased flex flex-col font-sans selection:bg-orba-500/30 selection:text-white">
        <AuthProvider>
          <ToastProvider>
            <RealtimeProvider>
              {/* Mobile Header (Hidden on md+) */}
              <Header />

              {/* Main Adaptive 3-Column Social Shell */}
              <div className="flex justify-center w-full min-h-screen bg-obsidian">
                <div className="flex w-full max-w-7xl">
                  {/* Left Column Navigation (Full on desktop, compact on tablet, hidden on mobile) */}
                  <Sidebar />

                  {/* Center Main Content Feed / Page */}
                  <main className="flex-1 min-w-0 min-h-screen border-r border-surface-borderLight/60 pb-20 md:pb-6">
                    {children}
                  </main>

                  {/* Right Context & Observability Panel (Desktop only) */}
                  <RightContextPanel />
                </div>
              </div>

              {/* Mobile Bottom Navigation */}
              <MobileNav />
            </RealtimeProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
