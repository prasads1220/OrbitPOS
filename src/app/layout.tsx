import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrbitPOS | Modern Retail & Business POS",
  description: "A professional, cloud-based Point of Sale system with real-time Stripe payments, inventory management, and financial reporting.",
  openGraph: {
    title: "OrbitPOS | Modern Retail & Business POS",
    description: "Secure, fast, and beautiful cloud-based POS system for modern businesses.",
    type: "website",
    siteName: "OrbitPOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrbitPOS | Modern Retail & Business POS",
    description: "The complete retail engine for your business.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-inter">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
