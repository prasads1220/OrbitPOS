'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Check, Info, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-32 pb-24">
        <div className="container px-8 mx-auto">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-black mb-6">
              Simple pricing. <br />
              <span className="text-[#0071e3]">No hidden fees.</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#86868b] font-medium mb-12">
              Choose the plan that best fits your business stage.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-bold ${!isAnnual ? 'text-black' : 'text-gray-400'}`}>Monthly</span>
              <button 
                onClick={() => setIsAnnual(!isAnnual)}
                className="w-14 h-8 rounded-full bg-gray-100 p-1 relative transition-colors hover:bg-gray-200"
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 transform ${isAnnual ? 'translate-x-6 bg-[#0071e3]' : 'translate-x-0'}`} />
              </button>
              <span className={`text-sm font-bold ${isAnnual ? 'text-black' : 'text-gray-400'}`}>Annual <span className="text-[#0071e3] ml-1">(Save 20%)</span></span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-32">
            <PricingCard 
              tier="Starter"
              price={isAnnual ? "49" : "59"}
              description="Perfect for new boutiques and small shops."
              features={[
                "1 Location",
                "Up to 3 Employees",
                "Basic Inventory Management",
                "Standard Reports",
                "Email Support"
              ]}
              buttonText="Get Started"
              href="/login"
            />
            <PricingCard 
              tier="Professional"
              price={isAnnual ? "99" : "119"}
              description="Ideal for growing businesses with multiple staff."
              features={[
                "3 Locations",
                "Unlimited Employees",
                "Advanced Inventory & COGS",
                "Automated Payroll",
                "Priority Email Support",
                "AI Sales Predictions"
              ]}
              highlighted
              buttonText="Start Free Trial"
              href="/login"
            />
            <PricingCard 
              tier="Enterprise"
              price="Custom"
              description="For large-scale retail operations and chains."
              features={[
                "Unlimited Locations",
                "Dedicated Account Manager",
                "Custom Integrations",
                "On-site Training",
                "24/7 Phone Support",
                "Custom Data Exports"
              ]}
              buttonText="Contact Sales"
              href="/contact"
            />
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <FAQItem 
                question="Can I change plans at any time?"
                answer="Yes, you can upgrade or downgrade your plan at any time from your store settings. Changes take effect immediately."
              />
              <FAQItem 
                question="Is there a free trial?"
                answer="We offer a 14-day free trial on our Professional plan. No credit card required to start."
              />
              <FAQItem 
                question="What hardware is compatible?"
                answer="OrbitPOS works with most modern USB and Bluetooth scanners, label printers, and receipt printers. See our hardware guide for details."
              />
              <FAQItem 
                question="Do you offer seasonal pauses?"
                answer="Yes, you can put your account on 'Hibernation' mode for a small fee to preserve your data during off-seasons."
              />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function PricingCard({ tier, price, description, features, highlighted, buttonText, href }: any) {
  return (
    <div className={`p-10 rounded-[2.5rem] flex flex-col transition-all duration-500 card-hover-effect relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ${
      highlighted 
        ? 'bg-black text-white shadow-[0_40px_100px_rgba(0,0,0,0.15)] ring-4 ring-blue-500/20' 
        : 'bg-[#f5f5f7] border border-gray-100'
    }`}>
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2">{tier}</h3>
        <p className={`text-sm font-medium ${highlighted ? 'text-gray-400' : 'text-[#86868b]'}`}>{description}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          {price !== "Custom" && <span className="text-2xl font-bold">₹</span>}
          <span className="text-5xl font-bold tracking-tight">{price}</span>
          {price !== "Custom" && <span className={`text-sm font-medium ${highlighted ? 'text-gray-400' : 'text-[#86868b]'}`}>/mo</span>}
        </div>
      </div>

      <div className="space-y-4 mb-10 flex-1">
        {features.map((feature: string, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? 'bg-blue-500' : 'bg-green-500'}`}>
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-[15px] font-medium">{feature}</span>
          </div>
        ))}
      </div>

      <Link href={href}>
        <Button className={`glossy-button w-full h-14 rounded-full text-lg font-bold transition-all ${
          highlighted 
            ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-lg shadow-blue-500/20' 
            : 'bg-white text-black hover:bg-gray-50 border border-gray-200'
        }`}>
          {buttonText}
        </Button>
      </Link>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#0071e3] transition-all duration-500 w-0 group-hover:w-full" />
    </div>
  );
}

function FAQItem({ question, answer }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#0071e3]">
        <HelpCircle className="w-5 h-5" />
        <h4 className="font-bold text-lg text-black">{question}</h4>
      </div>
      <p className="text-[#86868b] font-medium leading-relaxed pl-7">{answer}</p>
    </div>
  );
}
