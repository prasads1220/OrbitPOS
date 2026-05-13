'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-40 pb-24">
        <div className="container px-8 mx-auto max-w-4xl">
          <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <p className="text-[#0071e3] font-bold mb-4 uppercase tracking-widest text-xs">Updated May 12, 2026</p>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black mb-8">
              Privacy Policy
            </h1>
            <p className="text-xl text-[#86868b] font-medium leading-relaxed">
              At OrbitPOS, we take your privacy seriously. This policy outlines how we collect, use, and protect your store data and personal information.
            </p>
          </div>

          <div className="prose prose-lg max-w-none prose-headings:text-black prose-p:text-[#86868b] prose-p:font-medium prose-strong:text-black space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">1. Information We Collect</h2>
              <p className="mb-4">
                We collect information that you provide directly to us when you create an account, such as your name, email address, company name, and payment information.
              </p>
              <p>
                Additionally, we collect data related to your store operations, including inventory levels, transaction records, and employee attendance data, to provide our core services.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">2. How We Use Your Data</h2>
              <ul className="list-disc pl-6 space-y-3 text-[#86868b] font-medium">
                <li>To provide, maintain, and improve our POS services.</li>
                <li>To process transactions and send related information, including confirmations and invoices.</li>
                <li>To provide analytics and insights to help you grow your business.</li>
                <li>To send technical notices, updates, security alerts, and support messages.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">3. Data Security</h2>
              <p>
                We implement a variety of security measures to maintain the safety of your personal information. Your data is stored on secure servers with industry-standard encryption and access controls.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">4. Third-Party Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties except for trusted third parties who assist us in operating our website and conducting our business, so long as those parties agree to keep this information confidential.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal data. You can manage most of these settings directly through your store dashboard or by contacting our support team.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
