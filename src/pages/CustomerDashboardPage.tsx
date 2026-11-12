import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  MapPin,
  Sparkles,
  LogOut,
  RotateCcw,
  CreditCard,
  Plus,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { authApi, ordersApi, quotesApi, SavedAddressItem } from '../api';
import { formatGBP } from '../lib/utils';

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  pending_payment: { label: 'Awaiting Payment', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  paid: { label: 'Paid • Queued', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_production: { label: 'Printing in House', classes: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  printed: { label: 'Printed • Finishing', classes: 'bg-purple-100 text-purple-800 border-purple-200' },
  dispatched: { label: 'Dispatched (UK Courier)', classes: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  delivered: { label: 'Delivered', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  refunded: { label: 'Refunded', classes: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'quotes' | 'addresses'>('orders');

  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('bs4_user') || 'null');
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<SavedAddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Address Form State (Add or Edit — max 3 saved addresses)
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrCompany, setAddrCompany] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrCounty, setAddrCounty] = useState('');
  const [addrPostcode, setAddrPostcode] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDefault, setAddrDefault] = useState(true);
  const [savingAddr, setSavingAddr] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, ordersRes, quotesRes, addressesRes] = await Promise.all([
        authApi.getProfile(),
        ordersApi.getMyOrders(),
        quotesApi.getMyQuotes().catch(() => []),
        authApi.getAddresses().catch(() => []),
      ]);
      if (profileRes) {
        setUser(profileRes);
        localStorage.setItem('bs4_user', JSON.stringify(profileRes));
        setAddrRecipient(`${profileRes.firstName || ''} ${profileRes.lastName || ''}`.trim());
        setAddrPhone(profileRes.phone || '');
      }
      setOrders(ordersRes || []);
      setQuotes(quotesRes || []);
      setAddresses(addressesRes || []);
    } catch (err: any) {
      if (err.status === 401) {
        authApi.logoutCustomer();
        window.dispatchEvent(new Event('bs4-auth-change'));
        navigate('/login?redirect=/account', { replace: true });
        return;
      }
      setError(err.message || 'Could not load your account details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('bs4_token')) {
      navigate('/login?redirect=/account', { replace: true });
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    authApi.logoutCustomer();
    window.dispatchEvent(new Event('bs4-auth-change'));
    navigate('/', { replace: true });
  };

  // Reorder previous job with exact files & print configuration
  const handleReorder = (order: any) => {
    const firstItem = order.items?.[0];
    if (!firstItem) {
      navigate('/copyshop');
      return;
    }

    const cfg = firstItem.printConfiguration || {};
    const files = (firstItem.files || []).map((f: any) => ({
      id: f.id,
      serverFileId: f.id,
      name: f.originalName || firstItem.jobName,
      pageCount: f.pageCount || cfg.totalPages || 1,
      size: f.fileSizeBytes || 0,
      secureUrl: f.secureUrl,
    }));

    if (files.length === 0) {
      files.push({
        id: `reorder_${Date.now()}`,
        name: firstItem.jobName || 'Reordered_Document.pdf',
        pageCount: cfg.totalPages || 1,
        size: 0,
      });
    }

    const shippingMethod = order.shippingMethod === 'express' ? 'express' : 'standard';
    const shippingFee = shippingMethod === 'express' ? 6.99 : Number(order.subtotal) >= 30 ? 0 : 3.5;

    const jobData = {
      files,
      config: {
        paperSize: cfg.paperSize || 'A4',
        paperWeight: cfg.paperWeight || '80gsm',
        colorMode: cfg.colorMode || 'bw',
        printSides: cfg.printSides || 'duplex',
        pagesPerSheet: cfg.pagesPerSheet || 1,
        orientation: cfg.orientation || 'auto',
        bindingType: cfg.bindingType || 'none',
        frontCover: cfg.frontCover || 'none',
        backCover: cfg.backCover || 'none',
        copies: firstItem.copies || 1,
        physicalSheets: cfg.physicalSheets || 1,
        totalRawPages: cfg.totalPages || 1,
      },
      pricing: {
        unitPriceGross: Number(firstItem.unitPrice || order.subtotal),
        subtotal: Number(order.subtotal),
        rawSubtotal: Number(order.subtotal),
        shippingFee,
        shippingMethod,
        isFreeShipping: shippingFee === 0,
        grandTotal: Number((Number(order.subtotal) + shippingFee).toFixed(2)),
      },
    };

    sessionStorage.setItem('bs4_current_job', JSON.stringify(jobData));
    navigate('/checkout');
  };

  // Pay for an approved custom quote directly from user dashboard
  const handlePayQuote = (quote: any) => {
    const jobData = {
      isQuoteOrder: true,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      files: quote.fileUrls?.length
        ? quote.fileUrls
        : [{ name: `Custom Quote: ${quote.serviceCategory}`, pageCount: quote.specifications?.totalPages || 1 }],
      config: {
        ...quote.specifications,
        copies: quote.quantity || 1,
      },
      pricing: {
        unitPriceGross: Number(quote.quotedAmount),
        unitPriceNet: Number(quote.quotedAmount),
        subtotal: Number(quote.quotedAmount),
        rawSubtotal: Number(quote.quotedAmount),
        shippingFee: 0,
        shippingMethod: 'standard',
        isFreeShipping: true,
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

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddrLabel('Home');
    setAddrRecipient(`${user?.firstName || ''} ${user?.lastName || ''}`.trim());
    setAddrCompany('');
    setAddrLine1('');
    setAddrLine2('');
    setAddrCity('');
    setAddrCounty('');
    setAddrPostcode('');
    setAddrPhone(user?.phone || '');
    setAddrDefault(addresses.length === 0);
  };

  const openNewAddressForm = () => {
    if (addresses.length >= 3) {
      setError('You can save up to 3 UK delivery addresses. Please edit or delete an existing address first.');
      return;
    }
    setError(null);
    resetAddressForm();
    setShowAddAddress(true);
  };

  const openEditAddressForm = (addr: SavedAddressItem) => {
    setError(null);
    setEditingAddressId(addr.id || null);
    setAddrLabel(addr.label || 'Delivery Address');
    setAddrRecipient(addr.recipientName || '');
    setAddrCompany(addr.companyName || '');
    setAddrLine1(addr.addressLine1 || '');
    setAddrLine2(addr.addressLine2 || '');
    setAddrCity(addr.city || '');
    setAddrCounty(addr.county || '');
    setAddrPostcode(addr.postcode || '');
    setAddrPhone(addr.phone || '');
    setAddrDefault(Boolean(addr.isDefault));
    setShowAddAddress(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    setError(null);
    try {
      const payload: SavedAddressItem = {
        label: addrLabel,
        recipientName: addrRecipient,
        companyName: addrCompany,
        addressLine1: addrLine1,
        addressLine2: addrLine2,
        city: addrCity,
        county: addrCounty,
        postcode: addrPostcode.toUpperCase(),
        country: 'GB',
        phone: addrPhone,
        isDefault: addrDefault,
      };

      if (editingAddressId) {
        await authApi.updateAddress(editingAddressId, payload);
      } else {
        if (addresses.length >= 3) {
          throw new Error('You can save up to 3 UK delivery addresses. Please edit or delete an existing address first.');
        }
        await authApi.saveAddress(payload);
      }

      const updated = await authApi.getAddresses();
      setAddresses(updated);
      setShowAddAddress(false);
      resetAddressForm();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not save delivery address');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (addrId?: string) => {
    if (!addrId) return;
    setDeletingAddressId(addrId);
    setError(null);
    try {
      await authApi.deleteAddress(addrId);
      const updated = await authApi.getAddresses();
      setAddresses(updated);
      if (editingAddressId === addrId) {
        setShowAddAddress(false);
        resetAddressForm();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not delete delivery address');
    } finally {
      setDeletingAddressId(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Account Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Customer Dashboard</span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              Hello, {user?.firstName || 'Valued Customer'} {user?.lastName || ''}
            </h1>
            <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/copyshop"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Printer className="w-4 h-4" /> New Print Job
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Order History ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'quotes'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Custom Quotes ({quotes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Saved Delivery Addresses ({addresses.length})
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm font-semibold text-slate-500">
            Loading your print account...
          </div>
        ) : (
          <>
            {/* ORDER HISTORY TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                    <Package className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-900">No Print Orders Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Upload a PDF document in our copy shop to place your first order and unlock 1-click reorders.
                    </p>
                    <Link
                      to="/copyshop"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Start Your First Print Job <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => {
                    const badge = STATUS_BADGES[order.status] || {
                      label: order.status,
                      classes: 'bg-slate-100 text-slate-700 border-slate-200',
                    };
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-sm font-black text-blue-600">
                                {order.orderNumber}
                              </span>
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.classes}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} •{' '}
                              {order.shippingAddress?.addressLine1}, {order.shippingAddress?.postcode}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block">Total</span>
                              <span className="text-lg font-black text-slate-900">
                                {formatGBP(Number(order.totalAmount))}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleReorder(order)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reorder
                            </button>
                            <Link
                              to={`/order-confirmation/${order.orderNumber}`}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                            >
                              Receipt
                            </Link>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          {(order.items || []).map((item: any) => {
                            const cfg = item.printConfiguration;
                            return (
                              <div
                                key={item.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                  <div>
                                    <span className="font-bold text-slate-900 block">{item.jobName}</span>
                                    {cfg && (
                                      <span className="text-[11px] text-slate-500">
                                        {item.copies} {item.copies > 1 ? 'copies' : 'copy'} • {cfg.totalPages} pages • {cfg.paperSize} ({cfg.paperWeight}) •{' '}
                                        {cfg.colorMode === 'color' ? 'Colour' : 'B&W'} • {cfg.printSides} •{' '}
                                        {cfg.bindingType !== 'none' ? cfg.bindingType.toUpperCase() : 'Loose'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-bold text-slate-800">
                                  {formatGBP(Number(item.totalPrice))}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {order.trackingNumber && (
                          <div className="flex items-center gap-2 text-xs text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-xl px-3.5 py-2.5">
                            <Truck className="w-4 h-4 text-cyan-600" />
                            <span>
                              <strong>UK Courier Tracking:</strong>{' '}
                              <span className="font-mono font-bold">{order.trackingNumber}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CUSTOM QUOTES TAB */}
            {activeTab === 'quotes' && (
              <div className="space-y-4">
                {quotes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-900">No Custom Quotes Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Need bulk wholesale printing or custom stock? Request a quote in the Copy Shop and pay right here once priced.
                    </p>
                  </div>
                ) : (
                  quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-black text-blue-600">{quote.quoteNumber}</span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              quote.status === 'quoted'
                                ? 'bg-blue-100 text-blue-800'
                                : quote.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 capitalize">
                          {quote.serviceCategory.replace(/_/g, ' ')} • Quantity: {quote.quantity}
                        </p>

                        {/* Submitted Specifications & Cloudinary PDF Links */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                          {quote.specifications?.paperSize && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {quote.specifications.paperSize} • {quote.specifications.paperWeight || 'Standard'}
                            </span>
                          )}
                          {quote.specifications?.colorMode && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {quote.specifications.colorMode === 'color' ? 'Full Colour' : 'Black & White'}
                            </span>
                          )}
                          {(quote.specifications?.printSides || quote.specifications?.sides) && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium capitalize">
                              {quote.specifications.printSides || quote.specifications.sides}
                            </span>
                          )}
                          {quote.specifications?.bindingType && quote.specifications.bindingType !== 'none' && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium capitalize">
                              {quote.specifications.bindingType}
                            </span>
                          )}
                          {quote.specifications?.preferredDeadline && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium">
                              Deadline: {quote.specifications.preferredDeadline}
                            </span>
                          )}
                        </div>

                        {quote.customerNotes && (
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Your brief:</span> {quote.customerNotes}
                          </p>
                        )}

                        {Array.isArray(quote.fileUrls) && quote.fileUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {quote.fileUrls.map((f: any, fi: number) => {
                              const rawUrl = f.url || f.secureUrl || '';
                              const docUrl = rawUrl.startsWith('http')
                                ? rawUrl
                                : rawUrl
                                ? `http://localhost:5000${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
                                : '';
                              return docUrl ? (
                                <a
                                  key={f.id || fi}
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold text-blue-700"
                                >
                                  <ExternalLink className="w-3 h-3" /> {f.name || `Document ${fi + 1}`}
                                  {f.pageCount ? ` (${f.pageCount}p)` : ''}
                                </a>
                              ) : (
                                <span key={f.id || fi} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-600">
                                  <FileText className="w-3 h-3" /> {f.name || `Document ${fi + 1}`}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {quote.adminNotes && (
                          <p className="text-xs text-slate-700 bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5 italic">
                            Studio reply: "{quote.adminNotes}"
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Requested {new Date(quote.createdAt).toLocaleDateString('en-GB')}
                          {quote.turnaroundTime && ` • Turnaround: ${quote.turnaroundTime}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {quote.quotedAmount ? (
                          <div className="text-right mr-2">
                            <span className="text-[10px] uppercase text-slate-400 block">Quoted Price</span>
                            <span className="text-xl font-black text-slate-900">
                              {formatGBP(Number(quote.quotedAmount))}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> Reviewing
                          </span>
                        )}

                        {quote.status === 'quoted' && quote.quotedAmount && (
                          <button
                            type="button"
                            onClick={() => handlePayQuote(quote)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" /> Pay & Confirm Order
                          </button>
                        )}

                        {quote.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" /> Ordered
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SAVED ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Your Saved UK Delivery Addresses ({addresses.length} / 3)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Save up to 3 UK delivery addresses. To add another after reaching 3, edit or delete an existing one.
                    </p>
                  </div>
                  {addresses.length >= 3 && !showAddAddress ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-4 h-4" /> Max 3/3 Saved — Edit or Delete to Change
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (showAddAddress) {
                          setShowAddAddress(false);
                          resetAddressForm();
                        } else {
                          openNewAddressForm();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> {showAddAddress ? 'Cancel' : 'Add New Address'}
                    </button>
                  )}
                </div>

                {showAddAddress && (
                  <form
                    onSubmit={handleSaveAddress}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        {editingAddressId ? 'Edit UK Delivery Address' : 'New UK Delivery Address'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAddress(false);
                          resetAddressForm();
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Address Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Home / Office"
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name *</label>
                        <input
                          type="text"
                          required
                          value={addrRecipient}
                          onChange={(e) => setAddrRecipient(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Company (Optional)</label>
                        <input
                          type="text"
                          value={addrCompany}
                          onChange={(e) => setAddrCompany(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1 *</label>
                        <input
                          type="text"
                          required
                          value={addrLine1}
                          onChange={(e) => setAddrLine1(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={addrLine2}
                          onChange={(e) => setAddrLine2(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={addrCity}
                          onChange={(e) => setAddrCity(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">County</label>
                        <input
                          type="text"
                          value={addrCounty}
                          onChange={(e) => setAddrCounty(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Postcode *</label>
                        <input
                          type="text"
                          required
                          value={addrPostcode}
                          onChange={(e) => setAddrPostcode(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={addrDefault}
                          onChange={(e) => setAddrDefault(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        Set as default checkout delivery address
                      </label>
                      <button
                        type="submit"
                        disabled={savingAddr}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        {savingAddr ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.length === 0 ? (
                    <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                      No saved UK addresses yet. Add one above or save one during checkout.
                    </div>
                  ) : (
                    addresses.map((addr, idx) => (
                      <div
                        key={addr.id || idx}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {addr.label || 'Delivery Address'}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditAddressForm(addr)}
                              title="Edit address"
                              aria-label="Edit address"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingAddressId === addr.id}
                              onClick={() => handleDeleteAddress(addr.id)}
                              title="Delete address"
                              aria-label="Delete address"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="font-semibold text-slate-800">{addr.recipientName}</p>
                        {addr.companyName && <p className="text-slate-600">{addr.companyName}</p>}
                        <p className="text-slate-600">{addr.addressLine1}</p>
                        {addr.addressLine2 && <p className="text-slate-600">{addr.addressLine2}</p>}
                        <p className="text-slate-600">
                          {addr.city}
                          {addr.county ? `, ${addr.county}` : ''}, <strong className="uppercase">{addr.postcode}</strong>
                        </p>
                        {addr.phone && <p className="text-slate-500">Tel: {addr.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

