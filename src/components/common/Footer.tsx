import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Truck, Clock, MapPin, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      {/* Trust Badges Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">UK-Wide Delivery</h4>
              <p className="text-xs text-slate-400">Royal Mail Tracked & Express Courier</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">In-House Print Studio</h4>
              <p className="text-xs text-slate-400">Commercial grade Konica & Xerox presses</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Same-Day Dispatch</h4>
              <p className="text-xs text-slate-400">For orders confirmed before 1:00 PM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4 md:col-span-1">
            <Logo variant="light" size="sm" />
            <p className="text-xs leading-relaxed text-slate-400">
              BS4 Copy & Print Shop is Bristol’s dedicated online document printing service, serving university students, legal professionals, architects, and corporate offices across the UK.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span>BS4 Print Hub, Bristol, United Kingdom</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Print Services</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/copyshop" className="hover:text-white transition-colors">A4 Document Printing</a></li>
              <li><a href="/copyshop" className="hover:text-white transition-colors">Wire & Spiral Binding</a></li>
              <li><a href="/copyshop" className="hover:text-white transition-colors">Student Dissertations & Thesis</a></li>
              <li><a href="/copyshop" className="hover:text-white transition-colors">A3 Poster & Plan Printing</a></li>
              <li><a href="/copyshop" className="hover:text-white transition-colors">Training Manuals & Booklets</a></li>
            </ul>
          </div>

          {/* Specifications */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Paper & Specs</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-300 font-medium">Standard:</span> 80gsm FSC White</li>
              <li><span className="text-slate-300 font-medium">Presentation:</span> 100gsm Premium Silk</li>
              <li><span className="text-slate-300 font-medium">Cardstock:</span> 300gsm Heavy Cover</li>
              <li><span className="text-slate-300 font-medium">Covers:</span> 200µm Clear Acetate / Frost</li>
            </ul>
          </div>

          {/* Payment & Security */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Secure Checkout</h4>
            <p className="text-xs text-slate-400 mb-3">
              We accept all major UK cards, Apple Pay, Google Pay, and PayPal via 256-bit SSL encrypted Stripe.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>support@bs4printshop.co.uk</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BS4 Copy & Print Shop. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Crafted for commercial print-on-demand fulfillment.</p>
        </div>
      </div>
    </footer>
  );
};
