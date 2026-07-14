import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { UserProvider } from "@/components/providers/user-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: {
    default: "Exam Reviewer",
    template: "%s · Exam Reviewer",
  },
  description:
    "AI-powered board exam review platform with adaptive practice, mastery tracking, and a personal AI tutor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${plusJakartaSans.variable} ${newsreader.variable} antialiased min-h-screen`}
        >
          <SWRProvider>
            <UserProvider>
              <AppShell>{children}</AppShell>
            </UserProvider>
          </SWRProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </>
  );
}
