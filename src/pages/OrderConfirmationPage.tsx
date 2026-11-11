import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Printer,
  Truck,
  Clock,
  ArrowRight,
  PackageCheck,
  FileText,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { ordersApi } from '../api';

const PIPELINE_STEPS = [
  { key: 'paid', label: '1. Order Paid', statuses: ['paid', 'in_production', 'printed', 'dispatched', 'delivered'] },
  { key: 'in_production', label: '2. Printing', statuses: ['in_production', 'printed', 'dispatched', 'delivered'] },
  { key: 'printed', label: '3. Finishing', statuses: ['printed', 'dispatched', 'delivered'] },
  { key: 'dispatched', label: '4. Dispatched', statuses: ['dispatched', 'delivered'] },
];

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = Boolean(localStorage.getItem('bs4_token'));

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
        } catch {
          // Fall through to session fallback if matching orderNumber
        }
      }

      const cachedRaw =
        sessionStorage.getItem('bs4_completed_order') || sessionStorage.getItem('bs4_confirmed_order');
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          if (!orderNumber || parsed.orderNumber === orderNumber) {
            setOrder(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      setError('We could not find this order reference.');
      setLoading(false);
    };

    fetchOrder();
  }, [orderNumber]);

  const currentStatus = String(order?.status || 'pending_payment').toLowerCase();

  const activeStageIndex = useMemo(() => {
    if (currentStatus === 'delivered' || currentStatus === 'dispatched') return 3;
    if (currentStatus === 'printed') return 2;
    if (currentStatus === 'in_production') return 1;
    if (currentStatus === 'paid') return 0;
    return -1;
  }, [currentStatus]);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading your order confirmation...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Order Not Found</h1>
          <p className="text-xs text-slate-600">
            {error || 'Please verify your order reference or sign in to view your order history.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/copyshop" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
              Go to Copy Shop
            </Link>
            <Link to="/account" className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentOrderNum = order.orderNumber || orderNumber || '';
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="bg-slate-50 min-h-screen py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Confirmation Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span
                className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  currentStatus === 'pending_payment'
                    ? 'text-amber-700 bg-amber-50'
                    : currentStatus === 'cancelled' || currentStatus === 'refunded'
                    ? 'text-red-700 bg-red-50'
                    : 'text-emerald-700 bg-emerald-50'
                }`}
              >
                {currentStatus === 'pending_payment'
                  ? 'Order Created — Awaiting Payment'
                  : `Status: ${currentStatus.replace(/_/g, ' ')}`}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
                {currentStatus === 'pending_payment'
                  ? 'Order Recorded'
                  : 'Thank You! Your Order is Confirmed'}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                We have logged your print specification in our Brislington, Bristol production queue.
              </p>
            </div>
          </div>

          {/* Reference & Tracking Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Order Reference</span>
              <span className="text-xl font-mono font-black text-blue-600">{currentOrderNum}</span>
              {order.trackingNumber && (
                <div className="text-xs text-slate-600">
                  Courier Tracking: <span className="font-mono font-bold text-slate-900">{order.trackingNumber}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => window.print()}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
          </div>

          {/* Production & Delivery Pipeline */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              In-House Production Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {PIPELINE_STEPS.map((step, idx) => {
                const isDone = step.statuses.includes(currentStatus) && idx < activeStageIndex;
                const isCurrent = idx === activeStageIndex || (activeStageIndex === -1 && idx === 0 && currentStatus === 'paid');

                if (isDone || (idx === 3 && currentStatus === 'delivered')) {
                  return (
                    <div
                      key={step.key}
                      className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{step.label}</span>
                    </div>
                  );
                }

                if (isCurrent) {
                  return (
                    <div
                      key={step.key}
                      className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold flex items-center gap-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                      <span>{step.label}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={step.key}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-medium flex items-center gap-2"
                  >
                    {idx === 3 ? (
                      <Truck className="w-4 h-4 shrink-0 text-slate-400" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ordered Items & Print Specs */}
          {items.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Print Job Breakdown
              </h3>
              <div className="space-y-2.5">
                {items.map((item: any, i: number) => {
                  const cfg = item.configuration || {};
                  return (
                    <div
                      key={item.id || i}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>{item.jobName || `Print Job #${i + 1}`}</span>
                        </div>
                        <div className="text-slate-600">
                          {cfg.paperSize || 'A4'} • {cfg.paperType || '80gsm'} •{' '}
                          {cfg.colorMode === 'bw' ? 'B&W' : 'Full Colour'} •{' '}
                          {cfg.sides === 'double' ? 'Double-sided' : 'Single-sided'} •{' '}
                          {item.copies || 1} copy/copies • {item.totalRawPages || '?'} pages/copy
                        </div>
                        {cfg.binding && cfg.binding !== 'none' && (
                          <div className="text-blue-700 font-semibold capitalize">
                            Finishing: {cfg.binding}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 sm:text-right">
                        {formatGBP(Number(item.lineTotal || 0))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery & Payment Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block mb-1">Delivering To:</span>
              {order.shippingAddress ? (
                <>
                  <p className="text-slate-900 font-semibold">{order.shippingAddress.recipientName}</p>
                  {order.shippingAddress.companyName && (
                    <p className="text-slate-600">{order.shippingAddress.companyName}</p>
                  )}
                  <p className="text-slate-600">{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && (
                    <p className="text-slate-600">{order.shippingAddress.addressLine2}</p>
                  )}
                  <p className="text-slate-600">
                    {order.shippingAddress.city}, {order.shippingAddress.postcode}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">Standard UK Delivery</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block mb-1">Payment Summary:</span>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatGBP(Number(order.subtotal || 0))}</span>
              </div>
              {Number(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon ({order.couponCode || 'Discount'})</span>
                  <span>-{formatGBP(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery ({order.shippingMethod || 'standard'})</span>
                <span className="font-semibold text-slate-900">
                  {Number(order.shippingFee || 0) === 0 ? 'FREE' : formatGBP(Number(order.shippingFee))}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>Total Paid</span>
                <span className="text-blue-600">{formatGBP(Number(order.totalAmount || 0))}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isLoggedIn && (
              <Link
                to="/account"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all text-xs"
              >
                <UserCheck className="w-4 h-4" /> View My Orders & Reorder
              </Link>
            )}

            <Link
              to="/copyshop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all text-xs"
            >
              <span>Print Another Document</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all text-xs"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
