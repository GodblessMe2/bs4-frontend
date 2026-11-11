import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Printer, 
  Truck, 
  Clock, 
  Download, 
  ArrowRight,
  PackageCheck,
  FileCheck2
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { ordersApi } from '../api';

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (orderNumber) {
        try {
          const liveOrder = await ordersApi.getOrder(orderNumber);
          if (liveOrder) {
            setOrder(liveOrder);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Could not fetch live order from database:', e);
        }
      }

      const cached = sessionStorage.getItem('bs4_confirmed_order');
      if (cached) {
        setOrder(JSON.parse(cached));
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderNumber]);

  const currentOrderNum = orderNumber || order?.orderNumber || 'BS4-2026-9812';

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-md text-center space-y-6">
          
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Payment & Order Successful
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
              Thank You! Your Order is Confirmed
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              We've queued your document for in-house printing. A confirmation receipt has been emailed to you.
            </p>
          </div>

          {/* Reference Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Order Reference</span>
              <span className="text-xl font-mono font-black text-blue-600">{currentOrderNum}</span>
            </div>

            <button
              onClick={() => window.print()}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Order Receipt
            </button>
          </div>

          {/* Production & Delivery Pipeline */}
          <div className="text-left pt-2 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              In-House Production Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1. Order Paid</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                <span>2. Printing</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                <span>3. Finishing</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 shrink-0 text-slate-400" />
                <span>4. Dispatched</span>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          {order?.shippingAddress && (
            <div className="text-left bg-slate-50 rounded-xl p-4 text-xs space-y-1 border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Delivering To:</span>
              <p className="text-slate-900 font-semibold">{order.shippingAddress.recipientName}</p>
              <p className="text-slate-600">{order.shippingAddress.addressLine1}</p>
              <p className="text-slate-600">{order.shippingAddress.city}, {order.shippingAddress.postcode}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/copyshop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <span>Print Another Document</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all text-xs"
            >
              Return to Homepage
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};
