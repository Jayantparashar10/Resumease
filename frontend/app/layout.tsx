import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumeAse — ATS Scanner",
  description: "AI-powered ATS resume scanner with GitHub & portfolio analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "!bg-white dark:!bg-slate-800 !text-slate-900 dark:!text-slate-100 !border !border-slate-200 dark:!border-slate-700 !shadow-lg",
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
