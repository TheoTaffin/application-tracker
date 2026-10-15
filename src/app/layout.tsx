import type { Metadata } from "next";
import { JetBrains_Mono, Roboto } from "next/font/google";
import { Suspense } from "react";
import { NewApplicationHost } from "@/components/applications/new-application-host";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

// Self-hosted at build time by next/font: no requests to Google at runtime.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Application Tracker",
    template: "%s · Application Tracker",
  },
  description: "Track job applications, statuses, resumes and contacts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            {children}
          </div>
        </div>
        {/* The "new application" dialog opens from ?new on any page (and from the bookmarklet). */}
        <Suspense>
          <NewApplicationHost />
        </Suspense>
      </body>
    </html>
  );
}
