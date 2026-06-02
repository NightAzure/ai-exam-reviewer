import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { UserProvider } from "@/components/providers/user-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "AI Reviewer",
  description: "",
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        >
          <SWRProvider>
            <UserProvider>
              <AppShell>{children}</AppShell>
            </UserProvider>
          </SWRProvider>
          <Toaster richColors position="top-right" />
          {/*<ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>*/}
        </body>
      </html>
    </>
  );
}
