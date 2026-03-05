import type { Metadata } from "next";
import ThemeProvider from "@/src/components/providers/theme-provider";
import ToastProvider from "@/src/components/providers/toast-provider";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "HRIS",
    template: "%s | HRIS",
  },
  description: "A comprehensive Human Resource Information System (HRIS) designed to streamline HR processes, enhance employee management, and improve organizational efficiency. Our HRIS offers a user-friendly interface and powerful features to help businesses manage their workforce effectively.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
