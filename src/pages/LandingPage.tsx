import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pricingApi, PriceTierItem } from '../api';
import { formatGBP } from '../lib/utils';
import { 
  Printer, 
  UploadCloud, 
  Sparkles, 
  FileCheck2, 
  Layers, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Star,
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [tiers, setTiers] = useState<PriceTierItem[]>([]);

  useEffect(() => {
    pricingApi
      .queryTiers({ isActive: true })
      .then((res) => setTiers(res || []))
      .catch(() => {
        // Fallback to official 2026 baseline rates displayed below
      });
  }, []);

  const findRate = (category: string, subCategory: string, minQty: number, fallback: number): number => {
    const match = tiers.find((t) => t.category === category && t.subCategory === subCategory && t.minQty === minQty);
    return match && match.unitPrice != null ? Number(match.unitPrice) : fallback;
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-400/20 text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>The UK's Fast Online Copy Shop & Document Printer</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
                Upload your document. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">
                  We print, bind & deliver
                </span> <br/>
                straight to your door.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Professional in-house document printing on demand. From study notes, dissertations, and training manuals to corporate reports and A3 plans. Instant real-time pricing with fast UK dispatch.
              </p>

              {/* Pricing & Benefit Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>From <strong>10p / side</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>A4, A5 & A3 Formats</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Wire / Spiral Binding</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Next-Day UK Courier</span>
                </div>
              </div>

              {/* Primary Call to Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/copyshop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  <UploadCloud className="w-5 h-5" />
                  Upload Document & Order
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 transition-all"
                >
                  How It Works
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right Column: Visual Print Studio Mockup */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backdrop */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-25 blur-xl"></div>

                <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">BS4 Print Configurator</span>
                  </div>

                  {/* Document preview card */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-14 h-18 bg-white rounded shadow-md flex flex-col justify-between p-1.5 shrink-0 border border-slate-200">
                      <div className="h-1 bg-blue-500 rounded-xs w-3/4"></div>
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 rounded-xs w-full"></div>
                        <div className="h-0.5 bg-slate-300 rounded-xs w-5/6"></div>
                        <div className="h-0.5 bg-slate-300 rounded-xs w-4/6"></div>
                      </div>
                      <div className="text-[7px] font-bold text-slate-400 text-right">PDF</div>
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">Final_Dissertation_2026.pdf</h4>
                        <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">64 Pgs</span>
                      </div>
                      <p className="text-xs text-slate-400">A4 • 100gsm Silk • Full Colour • Spiral Bound</p>
                    </div>
                  </div>

                  {/* Sample Config options breakdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block mb-0.5">Finishing</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" /> Metal Wire Bound
                      </span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block mb-0.5">Front Cover</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" /> Clear Acetate (200µ)
                      </span>
                    </div>
                  </div>

                  {/* Price Preview bar */}
                  <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Total Est. Price (Inc. VAT)</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-white">£14.20</span>
                        <span className="text-xs text-emerald-400 font-medium">Free standard shipping</span>
                      </div>
                    </div>

                    <Link
                      to="/copyshop"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      Try Now <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Popular Print Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">What We Print</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Tailored for Students, Professionals & Small Businesses
            </p>
            <p className="text-slate-600 text-sm sm:text-base">
              Every document is printed on commercial-grade digital presses with razor-sharp text and vibrant graphics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category 1 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Thesis & Dissertations</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                University compliant margin formats, 100gsm silky paper, wire or coil binding with crystal clear protective covers.
              </p>
              <Link to="/copyshop?preset=dissertation" className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 hover:gap-2 transition-all">
                Print Dissertation <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Category 2 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Training Manuals & Handouts</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Economical double-sided B&W or colour pages, 2-hole or 4-hole punched for binders, or bound with durable coils.
              </p>
              <Link to="/copyshop?preset=manuals" className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 hover:gap-2 transition-all">
                Print Manuals <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Category 3 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Legal & Financial Briefs</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Strict confidential handling, high-speed single-sided or duplex print runs, corner or booklet stapled.
              </p>
              <Link to="/copyshop?preset=legal" className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 hover:gap-2 transition-all">
                Print Documents <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Category 4 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">A3 Posters & Architectural Plans</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Crisp vector lines, CAD schematics, and presentation charts printed on high-grade A3 120gsm or 300gsm stock.
              </p>
              <Link to="/copyshop?preset=a3_plans" className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 hover:gap-2 transition-all">
                Print A3 Plans <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Simple 3-Step Process</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">How BS4 Copy & Print Works</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative space-y-4">
              <span className="text-4xl font-black text-blue-100 absolute top-4 right-6 select-none">01</span>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Upload Your PDF</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Drag and drop your PDF files. Our system automatically inspects page count, orientation, and resolution in seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative space-y-4">
              <span className="text-4xl font-black text-blue-100 absolute top-4 right-6 select-none">02</span>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Customise & See Live Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Choose paper size, 80g-300g paper, color mode, duplex, and spiral binding. Your exact quote updates in real-time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative space-y-4">
              <span className="text-4xl font-black text-blue-100 absolute top-4 right-6 select-none">03</span>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">We Print & Dispatch</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our in-house press operators produce your documents to high commercial standards and dispatch via tracked UK courier.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/copyshop"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
            >
              Start Printing Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Paper & Finishes Guide Section */}
      <section id="paper-finishes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Material Quality</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Premium Paper Stocks & Long-Lasting Bindings
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                We only print on genuine FSC-certified paper formulated for high-opacity and smudge-free laser toner adhesion.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    80g
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Standard Navigator 80gsm</h4>
                    <p className="text-xs text-slate-600">The classic, economical paper for everyday reading notes, drafts, and bulk corporate documentation.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    120g
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Premium Uncoated 120gsm</h4>
                    <p className="text-xs text-slate-600">Enhanced thickness and whiteness. Ideal for double-sided colour printing without show-through.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                    300g
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Heavyweight 300gsm Cardstock</h4>
                    <p className="text-xs text-slate-600">Sturdy presentation card suitable for certificates, portfolio front covers, and posters.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent Live 2026 Pricing Table */}
            <div id="pricing-guide" className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">2026 Copy Shop Retail Rates</h3>
                  <p className="text-xs text-slate-400">Live GBP (£) rates per printed side • Minimum order £2.00</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300">80gsm Standard</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3">Quantity (Sides)</th>
                      <th className="pb-3">A4 B&W</th>
                      <th className="pb-3">A4 Colour</th>
                      <th className="pb-3">A3 B&W</th>
                      <th className="pb-3">A3 Colour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2.5 font-sans text-slate-200">1 – 25 sides</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A4_BW', 1, 0.25))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A4_Color', 1, 0.50))}</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A3_BW', 1, 0.60))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A3_Color', 1, 1.20))}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans text-slate-200">26 – 50 sides</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A4_BW', 26, 0.20))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A4_Color', 26, 0.45))}</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A3_BW', 26, 0.45))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A3_Color', 26, 0.90))}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans text-slate-200">51 – 100 sides</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A4_BW', 51, 0.18))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A4_Color', 51, 0.40))}</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A3_BW', 51, 0.30))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A3_Color', 51, 0.80))}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans text-slate-200">101 – 500 sides</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A4_BW', 101, 0.15))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A4_Color', 101, 0.35))}</td>
                      <td className="py-2.5">{formatGBP(findRate('document_80gsm', 'A3_BW', 101, 0.26))}</td>
                      <td className="py-2.5 text-blue-300">{formatGBP(findRate('document_80gsm', 'A3_Color', 101, 0.70))}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans text-slate-200">501 – 1,000 sides</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{formatGBP(findRate('document_80gsm', 'A4_BW', 501, 0.10))}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{formatGBP(findRate('document_80gsm', 'A4_Color', 501, 0.25))}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{formatGBP(findRate('document_80gsm', 'A3_BW', 501, 0.20))}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{formatGBP(findRate('document_80gsm', 'A3_Color', 501, 0.50))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl text-xs space-y-2 border border-slate-700/60">
                <div className="flex justify-between text-slate-300">
                  <span>Metal Wire / Spiral Binding:</span>
                  <span className="font-semibold text-white">£2.20 per book (1–100 sheets)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Protective Clear Acetate Cover:</span>
                  <span className="font-semibold text-white">£0.45</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>1,000+ Printed Sides / Wholesale:</span>
                  <span className="font-semibold text-amber-300">Custom Quote Available</span>
                </div>
              </div>

              <Link
                to="/copyshop"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Configure Your Job with Live Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to print your document?
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto text-base">
            Upload your PDF now, tweak your paper and binding options, and see the exact price before you pay. Fast delivery anywhere in the UK.
          </p>
          <div>
            <Link
              to="/copyshop"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-blue-900 bg-white hover:bg-blue-50 shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Go to Copy Shop & Upload PDF
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
