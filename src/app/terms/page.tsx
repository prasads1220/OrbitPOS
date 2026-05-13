'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-40 pb-24">
        <div className="container px-8 mx-auto max-w-4xl">
          <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <p className="text-[#0071e3] font-bold mb-4 uppercase tracking-widest text-xs">Effective May 12, 2026</p>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black mb-8">
              Terms of Use
            </h1>
            <p className="text-xl text-[#86868b] font-medium leading-relaxed">
              By using OrbitPOS, you agree to these terms. Please read them carefully to understand your rights and responsibilities.
            </p>
          </div>

          <div className="prose prose-lg max-w-none prose-headings:text-black prose-p:text-[#86868b] prose-p:font-medium prose-strong:text-black space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the OrbitPOS platform, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">2. Use License</h2>
              <p className="mb-4">
                OrbitPOS grants you a non-exclusive, non-transferable, limited license to use our platform for your internal business purposes, subject to these terms and the plan you have selected.
              </p>
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-3 text-[#86868b] font-medium">
                <li>Modify or copy the software materials.</li>
                <li>Attempt to decompile or reverse engineer any software contained on OrbitPOS.</li>
                <li>Remove any copyright or other proprietary notations from the materials.</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">3. Account Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. OrbitPOS cannot and will not be liable for any loss or damage arising from your failure to comply with this security obligation.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">4. Payment and Subscriptions</h2>
              <p>
                Fees are billed in advance on a monthly or annual basis and are non-refundable. All fees are exclusive of all taxes, levies, or duties imposed by taxing authorities.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">5. Limitation of Liability</h2>
              <p>
                In no event shall OrbitPOS or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on OrbitPOS.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
