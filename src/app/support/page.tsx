'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  LifeBuoy, 
  Settings, 
  CreditCard, 
  Users, 
  Zap, 
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Globe,
  Database
} from 'lucide-react';
import Link from 'next/link';

import Image from 'next/image';

export default function SupportPage() {
  const mockups = [
    '/pos-mockup-1.png',
    '/pos-mockup-2.png',
    '/pos-mockup-3.png',
    '/pos-mockup-1.png',
    '/pos-mockup-2.png',
    '/pos-mockup-3.png',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <section className="bg-[#f5f5f7] py-24 mb-20">
          <div className="container px-8 mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black mb-6">
              OrbitPOS Support
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-[#86868b] font-medium leading-relaxed">
              Explore our comprehensive guides and resources to get the most out of your modern retail platform.
            </p>
          </div>
        </section>

        <div className="container px-8 mx-auto">
          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
            <SupportCategory 
              icon={BookOpen} 
              title="Getting Started" 
              description="Learn the basics of setting up your OrbitPOS account and hardware."
              links={["Setting up your store", "Adding your first product", "Staff roles & permissions", "System requirements"]}
            />
            <SupportCategory 
              icon={Zap} 
              title="POS Features" 
              description="Master the checkout process, discounts, and inventory tracking."
              links={["Processing sales", "Applying discounts", "Managing stock levels", "Barcode scanning"]}
            />
            <SupportCategory 
              icon={Settings} 
              title="Advanced Settings" 
              description="Configure integrations, tax rates, and automated reporting."
              links={["API integrations", "Tax configuration", "Custom report builder", "Webhook setup"]}
            />
            <SupportCategory 
              icon={CreditCard} 
              title="Billing & Subscription" 
              description="Manage your plan, invoices, and payment methods."
              links={["Updating payment info", "Viewing invoices", "Upgrading your plan", "Refund policies"]}
            />
            <SupportCategory 
              icon={Users} 
              title="Employee Management" 
              description="Track attendance, manage payroll, and performance."
              links={["Setting up payroll", "Attendance tracking", "Commission structures", "Schedule management"]}
            />
            <SupportCategory 
              icon={LifeBuoy} 
              title="Troubleshooting" 
              description="Resolve common issues with hardware and synchronization."
              links={["Hardware connection issues", "Sync errors", "Offline mode usage", "Database recovery"]}
            />
            <SupportCategory 
              icon={ShieldCheck} 
              title="Security & Compliance" 
              description="Ensure your store data is protected and compliant with standards."
              links={["Data encryption", "Two-factor auth", "GDPR compliance", "Audit logs"]}
            />
            <SupportCategory 
              icon={Globe} 
              title="Multi-Store Operations" 
              description="Manage multiple locations and regions from a single dashboard."
              links={["Adding new locations", "Global inventory", "Region settings", "Consolidated reports"]}
            />
            <SupportCategory 
              icon={Database} 
              title="Data & Export" 
              description="Learn how to export your data for external analysis or migration."
              links={["CSV exports", "Backup frequency", "Migration guides", "Data retention"]}
            />
          </div>

          {/* Product Showcase Marquee */}
          <section className="mb-32 overflow-hidden py-20 bg-black rounded-[3rem] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10 pointer-events-none" />
            <div className="text-center mb-16 px-8 relative z-20">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Experience Excellence</h2>
              <p className="text-gray-400 font-medium text-lg">Designed for the world's most ambitious retail brands.</p>
            </div>
            <div className="flex animate-marquee gap-8 px-8">
              {mockups.map((src, i) => (
                <div key={i} className="relative w-[400px] md:w-[600px] aspect-video shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                  <Image 
                    src={src} 
                    alt={`Product mockup ${i + 1}`}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                    <p className="text-white font-bold text-xl">Premium Interface Design</p>
                    <p className="text-white/60 text-sm">Engineered for speed and elegance.</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact CTA & Support Form */}
          <section className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-2xl mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left Side: Info */}
              <div className="bg-[#f5f5f7] p-12 md:p-20">
                <div className="w-16 h-16 bg-[#0071e3] rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-black">Still need help?</h2>
                <p className="text-xl text-[#86868b] font-medium mb-10 leading-relaxed">
                  Our support team is available 24/7. Submit a ticket and we&apos;ll get back to you within 2 hours.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <Zap className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="font-bold text-black">Fast Response Time</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <ShieldCheck className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="font-bold text-black">Global Support Coverage</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Form */}
              <div className="p-12 md:p-20">
                <form 
                  action="https://formsubmit.co/orbitpossales@gmail.com" 
                  method="POST" 
                  className="space-y-6"
                >
                  <input type="hidden" name="_subject" value="New Support Ticket - OrbitPOS" />
                  <input type="hidden" name="_template" value="table" />
                  <input type="hidden" name="_captcha" value="false" />

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Store Name</label>
                    <input name="Store Name" required placeholder="e.g. Blue Boutique" className="w-full h-14 rounded-2xl bg-gray-50 border-gray-100 px-6 font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input name="Email" type="email" required placeholder="manager@store.com" className="w-full h-14 rounded-2xl bg-gray-50 border-gray-100 px-6 font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Issue Type</label>
                    <select name="Issue Type" className="w-full h-14 rounded-2xl bg-gray-50 border-gray-100 px-6 font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none appearance-none">
                      <option>Technical Issue</option>
                      <option>Billing Question</option>
                      <option>Hardware Setup</option>
                      <option>Feature Request</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea name="Description" required placeholder="How can we help you today?" className="w-full min-h-[150px] rounded-2xl bg-gray-50 border-gray-100 p-6 font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none" />
                  </div>

                  <Button type="submit" className="w-full h-16 bg-black hover:bg-gray-800 text-white rounded-2xl text-lg font-bold transition-all shadow-xl shadow-black/10">
                    Submit Support Ticket
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function SupportCategory({ icon: Icon, title, description, links }: any) {
  return (
    <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:bg-[#0071e3] transition-colors">
        <Icon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-[#86868b] font-medium text-[15px] mb-6 leading-relaxed">{description}</p>
      <div className="space-y-3">
        {links.map((link: string, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] cursor-pointer hover:underline">
            {link}
          </div>
        ))}
      </div>
    </div>
  );
}
