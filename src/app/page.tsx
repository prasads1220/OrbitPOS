import { Metadata } from 'next';
import LandingClient from '@/components/landing/landing-client';

export const metadata: Metadata = {
  title: 'OrbitPOS Sales | POS Systems & Retail Billing Software',
  description: 'OrbitPOS Sales provides modern POS systems, billing software, inventory management, and retail business solutions.',
  openGraph: {
    title: 'OrbitPOS Sales | POS Systems & Retail Billing Software',
    description: 'OrbitPOS Sales provides modern POS systems, billing software, inventory management, and retail business solutions.',
    type: 'website',
    url: 'https://orbitpossales.com',
    siteName: 'OrbitPOS Sales',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrbitPOS Sales | POS Systems & Retail Billing Software',
    description: 'OrbitPOS Sales provides modern POS systems, billing software, inventory management, and retail business solutions.',
  },
};

export default function Page() {
  return <LandingClient />;
}
