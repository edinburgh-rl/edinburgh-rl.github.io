import type { Metadata } from "next";
import "./globals.scss";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

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
    <html lang="en" data-theme="light" className="has-navbar-fixed-top">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.23/dist/katex.min.css" integrity="sha384-//SZkxyB7axjCAopkAL1E1rve+ZSPKapD89Lo/lLhcsXR+zOYl5z6zJZEFXil+q0" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
