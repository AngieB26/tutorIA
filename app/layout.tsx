import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TutorIA - Gestión Inteligente de Incidencias Estudiantiles",
  description: "Plataforma digital para registro de incidencias y asistencia estudiantil con IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-[#F8FAFC]">
          {children}
        </main>
      </body>
    </html>
  );
}

