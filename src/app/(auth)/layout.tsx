import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "HRIS",
    template: "%s | HRIS",
  },
  description: "A comprehensive Human Resource Information System (HRIS) designed to streamline HR processes, enhance employee management, and improve organizational efficiency. Our HRIS offers a user-friendly interface and powerful features to help businesses manage their workforce effectively.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
