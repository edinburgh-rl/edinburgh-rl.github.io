import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "UoE RL Reading Group",
  description: "University of Edinburgh Reinforcement Learning Reading Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body>
        {children}
      </body>
    </html>
  );
}
