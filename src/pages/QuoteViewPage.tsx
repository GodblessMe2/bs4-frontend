import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileCheck2, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  Calendar, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { quotesApi } from '../api';

export const QuoteViewPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await quotesApi.getQuoteByIdentifier(identifier!);
        setQuote(data);
      } catch (err: any) {
        setError(err.message || 'Quote request not found or expired');
      } finally {
        setLoading(false);
      }
    };

    if (identifier) fetchQuote();
  }, [identifier]);

  const handleProceedToPayment = () => {
    if (!quote || !quote.quotedAmount) return;

    // Load into session cart for checkout
    const jobData = {
      isQuoteOrder: true,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      files: quote.fileUrls || [{ name: `Custom Quote: ${quote.serviceCategory}`, pageCount: quote.specifications?.totalPages || 1 }],
      config: {
        ...quote.specifications,
        copies: quote.quantity || 1,
      },
      pricing: {
        unitPriceGross: Number(quote.quotedAmount),
        unitPriceNet: Number(quote.quotedAmount),
        subtotal: Number(quote.quotedAmount),
        shippingFee: 0, // Free courier for approved custom bulk quotes
        shippingMethod: 'standard',
        grandTotal: Number(quote.quotedAmount),
      },
      customer: {
        name: quote.customerName,
        email: quote.customerEmail,
        phone: quote.customerPhone,
      },
    };

    sessionStorage.setItem('bs4_current_job', JSON.stringify(jobData));
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-600">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          Loading quote details...
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Quote Not Found</h2>
          <p className="text-xs text-slate-600">The quote reference may be invalid or has expired.</p>
          <Link to="/copyshop" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <ArrowLeft className="w-4 h-4" /> Return to Copy Shop
          </Link>
        </div>
      </div>
    );
  }

  const isQuoted = quote.status === 'quoted';
  const isAccepted = quote.status === 'accepted';
  const isPending = quote.status === 'pending';

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-xs font-mono font-bold text-blue-600 block">REFERENCE #{quote.quoteNumber}</span>
              <h1 className="text-2xl font-black text-slate-900">Custom Print Quote</h1>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isQuoted ? 'bg-blue-100 text-blue-800' :
              isAccepted ? 'bg-emerald-100 text-emerald-800' :
              isPending ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-700'
            }`}>
              {quote.status}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
          
          {/* Status Header Notification */}
          {isPending && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm mb-0.5">Quote Request Under Review</span>
                Our in-house production team in Brislington is reviewing your document and quantities. You will receive an email as soon as the quote is priced and ready for payment.
              </div>
            </div>
          )}

          {isQuoted && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm mb-0.5">Your Quote is Ready!</span>
                Our production team has reviewed your specifications and provided the wholesale pricing below. Click "Proceed to Payment" to lock in your order.
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm mb-0.5">Quote Accepted & Paid</span>
                This order is currently scheduled for production in our commercial print facility.
              </div>
            </div>
          )}

          {/* Quote Pricing Highlight */}
          {quote.quotedAmount && (
            <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block uppercase tracking-wider">Approved Quoted Total</span>
                <span className="text-3xl font-black text-white">{formatGBP(Number(quote.quotedAmount))}</span>
                <span className="text-xs text-emerald-400 block mt-1">Includes all materials, commercial press run & delivery</span>
              </div>

              {quote.turnaroundTime && (
                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 text-xs text-slate-300">
                  <span className="block text-slate-400">Estimated Turnaround:</span>
                  <span className="font-bold text-white text-sm">{quote.turnaroundTime}</span>
                  {quote.validUntil && (
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Valid until {new Date(quote.validUntil).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin Note if present */}
          {quote.adminNotes && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Message from In-House Print Team:</span>
              <p className="text-slate-600 leading-relaxed italic">"{quote.adminNotes}"</p>
            </div>
          )}

          {/* Specifications Breakdown */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Job Specifications
            </h3>

            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2.5 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-900 capitalize">{quote.serviceCategory.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity / Copies:</span>
                <span className="font-bold text-slate-900">{quote.quantity}</span>
              </div>
              {quote.specifications?.paperSize && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Paper Format:</span>
                  <span className="font-bold text-slate-900">{quote.specifications.paperSize} ({quote.specifications.paperWeight})</span>
                </div>
              )}
              {quote.specifications?.colorMode && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Colour:</span>
                  <span className="font-bold text-slate-900">{quote.specifications.colorMode === 'color' ? 'Full Colour' : 'Black & White'}</span>
                </div>
              )}
              {quote.specifications?.bindingType && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Binding:</span>
                  <span className="font-bold text-slate-900 uppercase">{quote.specifications.bindingType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Action */}
          {isQuoted && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full sm:w-auto flex-1 py-4 px-6 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Payment ({formatGBP(Number(quote.quotedAmount))})
              </button>

              <Link
                to="/copyshop"
                className="w-full sm:w-auto py-4 px-6 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 text-center"
              >
                Decline / Configure New Job
              </Link>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
