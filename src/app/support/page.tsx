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

export default function SupportPage() {
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

          {/* Contact CTA */}
          <section className="bg-black text-white rounded-[3rem] p-12 md:p-20 text-center">
            <div className="w-16 h-16 bg-[#0071e3] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/20">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Still need help?</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-medium">
              Our support team is available 24/7 to help you with any questions or technical issues.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 rounded-full px-12 h-14 text-lg font-bold transition-all">
                   Open a Ticket
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-gray-800 text-white hover:bg-gray-900 rounded-full px-12 h-14 text-lg font-bold transition-all">
                   Chat with Expert
                </Button>
              </Link>
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
