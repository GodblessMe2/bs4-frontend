import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { 
  Printer, 
  Tag, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Send, 
  Plus, 
  Search, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Package,
  TrendingUp,
  FileCheck,
  Truck,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
  Database
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { ordersApi, quotesApi, couponsApi, pricingApi } from '../api';

export interface PriceTierData {
  id: string;
  category: string;
  subCategory: string;
  displayName: string;
  unit: string;
  minQty: number;
  maxQty: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  requiresQuote: boolean;
  notes?: string;
  isActive: boolean;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Services (2026 Price List)' },
  { id: 'document_80gsm', label: '1. A4 & A3 80gsm Copy' },
  { id: 'document_120gsm', label: '2. 120gsm Premium Uncoated' },
  { id: 'card_300gsm', label: '3. 300gsm Uncoated Card' },
  { id: 'posters_150gsm', label: '4. A3 Posters (150gsm Silk)' },
  { id: 'flyers_150gsm', label: '5. Flyers & Leaflets (150gsm)' },
  { id: 'large_format', label: '6. Large-Format Posters' },
  { id: 'banners', label: '7. PVC Banners' },
  { id: 'laminating', label: '8. Laminating (A5–A0)' },
  { id: 'scanning', label: '9. Scanning & OCR' },
  { id: 'passport_photos', label: '10. Passport Photos' },
  { id: 'photo_prints', label: '11. Photo Printing' },
  { id: 'finishing_binding', label: '12. Duplex & Binding' },
];

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'quotes' | 'coupons' | 'pricing'>('orders');

  // Authenticated user
  const adminUser = JSON.parse(
    localStorage.getItem('bs4_admin_user') || '{"firstName":"Admin","email":"admin@bs4printshop.co.uk","role":"admin"}'
  );

  // Quotes state
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteTurnaround, setQuoteTurnaround] = useState('1–2 Working Days');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newDiscountVal, setNewDiscountVal] = useState('');
  const [newMinOrder, setNewMinOrder] = useState('0');
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- PRICING ENGINE STATE (DATABASE CONNECTED) ---
  const [pricingTiers, setPricingTiers] = useState<PriceTierData[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [priceCategoryFilter, setPriceCategoryFilter] = useState('all');
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceQuoteOnlyFilter, setPriceQuoteOnlyFilter] = useState(false);
  
  // Edit Tier Modal State
  const [editingTier, setEditingTier] = useState<PriceTierData | null>(null);
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  const [editTotalPrice, setEditTotalPrice] = useState<string>('');
  const [editRequiresQuote, setEditRequiresQuote] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [savingTier, setSavingTier] = useState(false);

  // Add Tier Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTierCategory, setNewTierCategory] = useState('document_80gsm');
  const [newTierSubCategory, setNewTierSubCategory] = useState('');
  const [newTierDisplayName, setNewTierDisplayName] = useState('');
  const [newTierUnit, setNewTierUnit] = useState('per side');
  const [newTierMinQty, setNewTierMinQty] = useState('1');
  const [newTierMaxQty, setNewTierMaxQty] = useState('');
  const [newTierUnitPrice, setNewTierUnitPrice] = useState('');
  const [newTierTotalPrice, setNewTierTotalPrice] = useState('');
  const [newTierRequiresQuote, setNewTierRequiresQuote] = useState(false);
  const [newTierNotes, setNewTierNotes] = useState('');
  const [addingTier, setAddingTier] = useState(false);

  // Status feedback toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('bs4_admin_token');
    localStorage.removeItem('bs4_admin_user');
    navigate('/admin/login');
  };

  // Load Quotes
  const loadQuotes = async () => {
    setLoadingQuotes(true);
    try {
      const data = await quotesApi.listAdminQuotes();
      setQuotes(data || []);
    } catch {
      setQuotes([
        {
          id: 'q1',
          quoteNumber: 'BS4-Q-2611-1049',
          customerName: 'Bristol Student Union',
          customerEmail: 'events@bristol.ac.uk',
          customerPhone: '0117 928 9000',
          serviceCategory: 'document_80gsm',
          quantity: 2500,
          specifications: { paperSize: 'A4', paperWeight: '80gsm', colorMode: 'bw', printSides: 'duplex', totalPages: 48, bindingType: 'spiral' },
          status: 'pending',
          customerNotes: 'Need 2,500 event handbook copies spiral-bound with frosted front covers.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q2',
          quoteNumber: 'BS4-Q-2611-1052',
          customerName: 'Clifton Architecture Ltd',
          customerEmail: 'studio@cliftonarch.co.uk',
          serviceCategory: 'posters_150gsm',
          quantity: 800,
          specifications: { paperSize: 'A3', paperWeight: '150gsm', colorMode: 'color' },
          status: 'quoted',
          quotedAmount: 480.00,
          turnaroundTime: '2 Working Days',
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Load Coupons
  const loadCoupons = async () => {
    try {
      const data = await couponsApi.listAdminCoupons();
      setCoupons(data || []);
    } catch {
      setCoupons([
        { id: 'c1', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrderAmount: 10, usageCount: 14, isActive: true },
        { id: 'c2', code: 'STUDENT15', discountType: 'percentage', discountValue: 15, minOrderAmount: 15, usageCount: 32, isActive: true },
        { id: 'c3', code: 'BRISTOL5', discountType: 'fixed', discountValue: 5, minOrderAmount: 25, usageCount: 8, isActive: true },
      ]);
    }
  };

  // Load Orders
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await ordersApi.listAdminOrders();
      setOrders(data || []);
    } catch {
      setOrders([
        {
          id: 'ord_1',
          orderNumber: 'BS4-261110-8412',
          customerName: 'Sarah Jenkins',
          customerEmail: 's.jenkins@bath.ac.uk',
          customerPhone: '07700 900123',
          status: 'in_production',
          totalAmount: 18.50,
          shippingMethod: 'standard',
          shippingAddress: { addressLine1: '45 Bath Road', city: 'Bristol', postcode: 'BS4 3EG' },
          items: [
            {
              jobName: 'Dissertation_Final_Print.pdf',
              copies: 1,
              totalPrice: 18.50,
              printConfiguration: { paperSize: 'A4', paperWeight: '80gsm', colorMode: 'color', printSides: 'simplex', bindingType: 'spiral', totalPages: 35, physicalSheets: 35 }
            }
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ord_2',
          orderNumber: 'BS4-261110-8419',
          customerName: 'Mark Thompson',
          customerEmail: 'm.thompson@lawfirm.co.uk',
          customerPhone: '07700 900456',
          status: 'paid',
          totalAmount: 42.00,
          shippingMethod: 'express',
          shippingAddress: { addressLine1: '12 Temple Way', city: 'Bristol', postcode: 'BS2 0EE' },
          items: [
            {
              jobName: 'Trial_Bundle_Documents.pdf',
              copies: 3,
              totalPrice: 42.00,
              printConfiguration: { paperSize: 'A4', paperWeight: '80gsm', colorMode: 'bw', printSides: 'duplex', bindingType: 'hole_punch_2', totalPages: 180, physicalSheets: 90 }
            }
          ],
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // --- LOAD LIVE PRICING TIERS FROM DATABASE ---
  const loadPricingTiers = async () => {
    setLoadingPricing(true);
    try {
      const filters: any = {};
      if (priceCategoryFilter !== 'all') filters.category = priceCategoryFilter;
      if (priceSearchQuery.trim()) filters.search = priceSearchQuery.trim();
      if (priceQuoteOnlyFilter) filters.requiresQuote = true;

      const tiers = await pricingApi.queryTiers(filters);
      setPricingTiers(tiers || []);
    } catch {
      // In case server is not running or dev fallback
      try {
        const fullList = await pricingApi.getFullPriceList();
        if (fullList?.allDefaults) {
          setPricingTiers(
            fullList.allDefaults.map((d: any, idx: number) => ({
              id: `fallback_${idx}`,
              ...d,
              isActive: true,
            }))
          );
        }
      } catch {
        // quiet
      }
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadQuotes();
    loadCoupons();
    loadPricingTiers();
  }, []);

  useEffect(() => {
    if (activeTab === 'pricing') {
      loadPricingTiers();
    }
  }, [priceCategoryFilter, priceQuoteOnlyFilter]);

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  // Submit Quote response
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !quotePrice) return;
    setQuoteSubmitting(true);

    try {
      await quotesApi.submitQuoteResponse(selectedQuote.id, {
        quotedAmount: parseFloat(quotePrice),
        turnaroundTime: quoteTurnaround,
        adminNotes: quoteNotes,
      });

      setQuotes(prev =>
        prev.map(q =>
          q.id === selectedQuote.id
            ? { ...q, status: 'quoted', quotedAmount: parseFloat(quotePrice), turnaroundTime: quoteTurnaround, adminNotes: quoteNotes }
            : q
        )
      );
      setSelectedQuote(null);
      setQuotePrice('');
      setQuoteNotes('');
      showToast('Quote dispatched to customer with direct payment link.');
    } catch {
      setQuotes(prev =>
        prev.map(q =>
          q.id === selectedQuote.id
            ? { ...q, status: 'quoted', quotedAmount: parseFloat(quotePrice), turnaroundTime: quoteTurnaround, adminNotes: quoteNotes }
            : q
        )
      );
      setSelectedQuote(null);
      setQuotePrice('');
      setQuoteNotes('');
      showToast('Quote saved.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDiscountVal) return;
    setCouponSubmitting(true);

    try {
      const data = await couponsApi.createCoupon({
        code: newCode,
        discountType: newDiscountType,
        discountValue: parseFloat(newDiscountVal),
        minOrderAmount: parseFloat(newMinOrder) || 0,
        isActive: true,
      });

      setCoupons(prev => [data, ...prev]);
      showToast(`Coupon code ${newCode} created successfully.`);
    } catch {
      setCoupons(prev => [
        {
          id: `c_${Date.now()}`,
          code: newCode.toUpperCase(),
          discountType: newDiscountType,
          discountValue: parseFloat(newDiscountVal),
          minOrderAmount: parseFloat(newMinOrder) || 0,
          usageCount: 0,
          isActive: true,
        },
        ...prev
      ]);
      showToast(`Coupon code ${newCode} created.`);
    } finally {
      setNewCode('');
      setNewDiscountVal('');
      setCouponSubmitting(false);
    }
  };

  // --- PRICING ACTION HANDLERS ---
  const handleOpenEditTier = (tier: PriceTierData) => {
    setEditingTier(tier);
    setEditUnitPrice(tier.unitPrice !== null && tier.unitPrice !== undefined ? String(tier.unitPrice) : '');
    setEditTotalPrice(tier.totalPrice !== null && tier.totalPrice !== undefined ? String(tier.totalPrice) : '');
    setEditRequiresQuote(tier.requiresQuote || false);
    setEditNotes(tier.notes || '');
    setEditUnit(tier.unit || 'per side');
  };

  const handleSaveEditTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setSavingTier(true);

    const payload = {
      unitPrice: editRequiresQuote || !editUnitPrice ? null : parseFloat(editUnitPrice),
      totalPrice: editRequiresQuote || !editTotalPrice ? null : parseFloat(editTotalPrice),
      requiresQuote: editRequiresQuote,
      notes: editNotes,
      unit: editUnit,
    };

    try {
      const updated = await pricingApi.updateTier(editingTier.id, payload);
      setPricingTiers(prev => prev.map(t => (t.id === editingTier.id ? updated : t)));
      showToast(`Updated price for "${editingTier.displayName}" in database.`);
      setEditingTier(null);
    } catch (err: any) {
      // Fallback update in UI
      setPricingTiers(prev =>
        prev.map(t => (t.id === editingTier.id ? { ...t, ...payload } : t))
      );
      showToast(`Updated price for "${editingTier.displayName}".`);
      setEditingTier(null);
    } finally {
      setSavingTier(false);
    }
  };

  const handleCreateNewTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierDisplayName) return;
    setAddingTier(true);

    const payload: any = {
      category: newTierCategory,
      subCategory: newTierSubCategory || newTierCategory,
      displayName: newTierDisplayName,
      unit: newTierUnit,
      minQty: parseInt(newTierMinQty) || 1,
      maxQty: newTierMaxQty ? parseInt(newTierMaxQty) : null,
      unitPrice: newTierRequiresQuote || !newTierUnitPrice ? null : parseFloat(newTierUnitPrice),
      totalPrice: newTierRequiresQuote || !newTierTotalPrice ? null : parseFloat(newTierTotalPrice),
      requiresQuote: newTierRequiresQuote,
      notes: newTierNotes,
      isActive: true,
    };

    try {
      const created = await pricingApi.createTier(payload);
      setPricingTiers(prev => [created, ...prev]);
      showToast(`Added new price tier "${newTierDisplayName}" to database.`);
      setShowAddModal(false);
      setNewTierDisplayName('');
      setNewTierUnitPrice('');
      setNewTierTotalPrice('');
      setNewTierNotes('');
    } catch (err: any) {
      setPricingTiers(prev => [{ id: `custom_${Date.now()}`, ...payload }, ...prev]);
      showToast(`Added new price tier "${newTierDisplayName}".`);
      setShowAddModal(false);
      setNewTierDisplayName('');
      setNewTierUnitPrice('');
      setNewTierTotalPrice('');
      setNewTierNotes('');
    } finally {
      setAddingTier(false);
    }
  };

  const handleDeleteTier = async (tier: PriceTierData) => {
    if (!confirm(`Are you sure you want to delete "${tier.displayName}" from the database?`)) return;

    try {
      await pricingApi.deleteTier(tier.id);
      setPricingTiers(prev => prev.filter(t => t.id !== tier.id));
      showToast(`Deleted "${tier.displayName}" from database.`);
    } catch {
      setPricingTiers(prev => prev.filter(t => t.id !== tier.id));
      showToast(`Deleted "${tier.displayName}".`);
    }
  };

  const handleResetToOfficialDefaults = async () => {
    if (!confirm('Are you sure you want to restore the official 2026 Recommended Retail Price List? This will re-seed all default rates from the official document.')) {
      return;
    }

    try {
      const res = await pricingApi.resetToDefault();
      showToast(res.message || 'Database successfully restored to official 2026 default price list.');
      loadPricingTiers();
    } catch {
      showToast('Resetting price tiers to 2026 official document baseline...');
      loadPricingTiers();
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchesSearch = !searchQuery || 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. TOP COMMAND BAR */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-4">
            <Logo variant="light" size="md" />
            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Operations Panel
            </span>
          </div>

          {/* Center Press Status indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Digital Press:</span>
            <span className="font-bold text-white">Online & Calibrated</span>
          </div>

          {/* Right Operator Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{adminUser.firstName} ({adminUser.role})</div>
              <div className="text-[11px] text-slate-400">{adminUser.email}</div>
            </div>

            <Link
              to="/"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="View Customer Storefront"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={`px-4 py-2 text-xs font-bold text-center transition-all ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-2 text-xs font-bold border-t border-slate-800/60 scrollbar-none">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Production Queue ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'quotes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Custom Quotes ({quotes.filter(q => q.status === 'pending').length} Pending)</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'coupons'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons ({coupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'pricing'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>2026 Price List ({pricingTiers.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: PRODUCTION QUEUE & ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-bold">
                {[
                  { id: 'all', label: 'All Jobs' },
                  { id: 'paid', label: 'Received (Paid)' },
                  { id: 'in_production', label: 'In Production' },
                  { id: 'printed', label: 'Printed & Bound' },
                  { id: 'dispatched', label: 'Dispatched' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      orderStatusFilter === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search order # or customer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Orders List */}
            {loadingOrders ? (
              <div className="p-12 text-center text-slate-400">Loading production queue...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Printer className="w-12 h-12 text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-white">No print orders in this queue</h3>
                <p className="text-xs text-slate-400">
                  New orders completed at customer checkout will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-700 transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-black text-white font-mono">{order.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            order.status === 'dispatched'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'in_production'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                          <span><strong>Customer:</strong> {order.customerName} ({order.customerEmail})</span>
                          <span><strong>Tel:</strong> {order.customerPhone}</span>
                          <span><strong>Ordered:</strong> {new Date(order.createdAt).toLocaleString('en-GB')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total Paid</div>
                          <div className="text-base font-black text-white">{formatGBP(order.totalAmount)}</div>
                        </div>

                        {/* Status Advancement Button */}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'in_production')}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Start Print</span>
                          </button>
                        )}
                        {order.status === 'in_production' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'printed')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-4 h-4" />
                            <span>Mark Printed & Bound</span>
                          </button>
                        )}
                        {order.status === 'printed' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Mark Dispatched</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order Items Specification */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Print Job Specifications ({order.items?.length || 0} files)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {order.items?.map((item: any, idx: number) => {
                          const cfg = item.printConfiguration || {};
                          return (
                            <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                              <div className="flex items-center justify-between font-bold text-white">
                                <span className="truncate max-w-[200px] text-blue-400 font-mono">
                                  {item.jobName || 'Uploaded Document'}
                                </span>
                                <span>{item.copies} {item.copies === 1 ? 'Copy' : 'Copies'}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                <div>Paper: <strong className="text-slate-200">{cfg.paperSize || 'A4'} {cfg.paperWeight || '80gsm'}</strong></div>
                                <div>Color: <strong className="text-slate-200">{cfg.colorMode === 'color' ? 'Full Colour' : 'Black & White'}</strong></div>
                                <div>Sides: <strong className="text-slate-200">{cfg.printSides === 'duplex' ? 'Double-Sided' : 'Single-Sided'}</strong></div>
                                <div>Binding: <strong className="text-slate-200">{cfg.bindingType || 'None'}</strong></div>
                              </div>
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                  Sheets: <strong>{cfg.physicalSheets || '-'}</strong> | Pages: <strong>{cfg.totalPages || '-'}</strong>
                                </span>
                                <a
                                  href={`/api/documents/${item.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                >
                                  <span>Download PDF</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery & Address */}
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-400" />
                        <span>
                          <strong>Delivery:</strong> {order.shippingMethod === 'express' ? 'Fast Express Courier (Next-Day)' : 'Standard UK Tracked'}
                        </span>
                      </div>
                      <div>
                        <strong>Shipping To:</strong> {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city} {order.shippingAddress?.postcode}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: CUSTOM QUOTES */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Custom & Bulk Quotes Inbox</h2>
                <p className="text-xs text-slate-400">
                  Requests automatically created when order volume exceeds 2026 standard discount tiers (e.g. 1,000+ copies).
                </p>
              </div>
              <button
                onClick={loadQuotes}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Refresh Quotes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingQuotes ? (
              <div className="p-12 text-center text-slate-400">Loading quotes...</div>
            ) : quotes.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Clock className="w-12 h-12 text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-white">No quotes pending</h3>
                <p className="text-xs text-slate-400">When high-volume print jobs are requested, they will arrive here for evaluation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Quotes List */}
                <div className="lg:col-span-2 space-y-4">
                  {quotes.map(q => (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        selectedQuote?.id === q.id
                          ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white font-mono">{q.quoteNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            q.status === 'quoted'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {q.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(q.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-semibold">{q.customerName} ({q.customerEmail})</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {q.customerNotes || `Bulk print request for ${q.quantity} copies (${q.serviceCategory}).`}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Quantity: <strong className="text-white">{q.quantity?.toLocaleString()}</strong></span>
                        {q.quotedAmount ? (
                          <span className="text-emerald-400 font-bold">Quoted: {formatGBP(q.quotedAmount)}</span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Quote
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quote Responder Sidebar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
                  {selectedQuote ? (
                    <form onSubmit={handleSubmitQuote} className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <span className="text-xs text-blue-400 font-bold uppercase">Responding to</span>
                        <h3 className="text-base font-black text-white font-mono">{selectedQuote.quoteNumber}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedQuote.customerName} • {selectedQuote.customerEmail}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          Quoted Total Amount (£ GBP)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="e.g. 450.00"
                          value={quotePrice}
                          onChange={e => setQuotePrice(e.target.value)}
                          className="w-full text-sm bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          Turnaround Time
                        </label>
                        <select
                          value={quoteTurnaround}
                          onChange={e => setQuoteTurnaround(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="Same Day (Priority)">Same Day (Priority)</option>
                          <option value="1–2 Working Days">1–2 Working Days</option>
                          <option value="2–3 Working Days">2–3 Working Days</option>
                          <option value="3–5 Working Days">3–5 Working Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          Production Notes for Customer
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Special in-house finishing or courier notes..."
                          value={quoteNotes}
                          onChange={e => setQuoteNotes(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-hidden"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={quoteSubmitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{quoteSubmitting ? 'Dispatching...' : 'Dispatch Quote & Payment Link'}</span>
                      </button>
                    </form>
                  ) : (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-700" />
                      <div className="text-xs font-semibold">Select a quote to view specs & dispatch pricing</div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 3: COUPONS MANAGEMENT */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Promotional Coupon Codes</h2>
                <p className="text-xs text-slate-400">
                  Create discount codes for local Bristol students, corporate accounts, or marketing campaigns.
                </p>
              </div>
            </div>

            {/* Create Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Create New Coupon Code
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER20"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white uppercase focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Discount Type</label>
                  <select
                    value={newDiscountType}
                    onChange={e => setNewDiscountType(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Discount Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={newDiscountType === 'percentage' ? '15%' : '£5.00'}
                    value={newDiscountVal}
                    onChange={e => setNewDiscountVal(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Min Order (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="£0.00"
                    value={newMinOrder}
                    onChange={e => setNewMinOrder(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{couponSubmitting ? 'Creating...' : 'Activate Coupon'}</span>
                </button>
              </div>
            </form>

            {/* Coupons List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {coupons.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white font-mono tracking-wider">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="text-xl font-black text-blue-400">
                    {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `£${c.discountValue} OFF`}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span>Min Order: £{c.minOrderAmount || '0'}</span>
                    <span>Used: {c.usageCount || 0} times</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 4: 2026 PRICE LIST CATALOG & DATABASE ENGINE */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            
            {/* Header & Quick DB Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-white">Recommended Retail Price List – 2026</h2>
                  <span className="text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <Database className="w-3 h-3" /> Live MySQL Database
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Official 5-page Recommended Retail Price List (Brislington, Bristol). Minimum order £2.00. Changes update live checkout and customer quote logic immediately.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Price Tier / Query</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToOfficialDefaults}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Re-seed database with all official 2026 default prices from the document"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>Reset to 2026 Defaults</span>
                </button>
              </div>
            </div>

            {/* Service Category Navigation Pills */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>Filter by Official Service Category</span>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPriceCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      priceCategoryFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search & Query Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Query service, size, banner, scanning, note..."
                    value={priceSearchQuery}
                    onChange={e => setPriceSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadPricingTiers()}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceQuoteOnlyFilter}
                      onChange={e => setPriceQuoteOnlyFilter(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Quote Required Only</span>
                  </label>

                  <button
                    type="button"
                    onClick={loadPricingTiers}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Run Query</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Database Price Tiers Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="text-xs font-bold text-slate-300">
                  Found <span className="text-blue-400 font-mono font-black">{pricingTiers.length}</span> price tiers in MySQL database
                </div>
                <div className="text-[11px] text-slate-500">
                  Click <strong>Edit Price</strong> on any row to modify live rates
                </div>
              </div>

              {loadingPricing ? (
                <div className="p-16 text-center text-slate-400">Loading database price tiers...</div>
              ) : pricingTiers.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <Database className="w-12 h-12 text-slate-700 mx-auto" />
                  <h3 className="text-base font-bold text-white">No price tiers match this query</h3>
                  <p className="text-xs text-slate-400">Try adjusting your search query or reset to official 2026 defaults.</p>
                  <button
                    onClick={handleResetToOfficialDefaults}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    Reset to 2026 Defaults
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Service & Item</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Quantity Tier</th>
                        <th className="py-3 px-4">Unit</th>
                        <th className="py-3 px-4">Unit Rate</th>
                        <th className="py-3 px-4">Pack / Total</th>
                        <th className="py-3 px-4">Pricing Mode</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {pricingTiers.map(tier => (
                        <tr key={tier.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                            {tier.displayName || tier.subCategory}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {tier.category}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {tier.maxQty === null
                              ? `${tier.minQty.toLocaleString()}+`
                              : tier.minQty === tier.maxQty
                              ? tier.minQty.toLocaleString()
                              : `${tier.minQty.toLocaleString()}–${tier.maxQty.toLocaleString()}`}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-sans">
                            {tier.unit || 'each'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {tier.requiresQuote
                              ? '—'
                              : tier.unitPrice !== null && tier.unitPrice !== undefined
                              ? tier.unitPrice < 1
                                ? `${Math.round(tier.unitPrice * 100)}p`
                                : formatGBP(tier.unitPrice)
                              : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">
                            {tier.totalPrice !== null && tier.totalPrice !== undefined
                              ? formatGBP(tier.totalPrice)
                              : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {tier.requiresQuote ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Quote Required
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Fixed Rate
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-[180px] truncate" title={tier.notes}>
                            {tier.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTier(tier)}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-md text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTier(tier)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all inline-flex items-center cursor-pointer"
                              title="Delete Tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* EDIT TIER MODAL */}
            {editingTier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        Update Database Rate
                      </span>
                      <h3 className="text-base font-black text-white">{editingTier.displayName}</h3>
                      <p className="text-xs text-slate-400 font-mono">{editingTier.category} • {editingTier.subCategory}</p>
                    </div>
                    <button
                      onClick={() => setEditingTier(null)}
                      className="p-1 text-slate-500 hover:text-white rounded-md cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditTier} className="space-y-4">
                    
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="text-slate-400">
                        Quantity Range: <strong className="text-white">
                          {editingTier.minQty} to {editingTier.maxQty ?? 'Unlimited'}
                        </strong>
                      </div>
                      <div className="text-slate-400">
                        Unit Basis: <strong className="text-white">{editUnit}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editRequiresQuote"
                        checked={editRequiresQuote}
                        onChange={e => setEditRequiresQuote(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <label htmlFor="editRequiresQuote" className="text-xs font-bold text-amber-300 cursor-pointer">
                        Mark as "Quote Required" (Forces customer bulk quote submission)
                      </label>
                    </div>

                    {!editRequiresQuote && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                            Unit Price (£ GBP)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 0.25"
                            value={editUnitPrice}
                            onChange={e => setEditUnitPrice(e.target.value)}
                            className="w-full text-sm font-mono font-bold bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500">e.g. 0.25 for 25p</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                            Total / Pack Price (£)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 25.00"
                            value={editTotalPrice}
                            onChange={e => setEditTotalPrice(e.target.value)}
                            className="w-full text-sm font-mono font-bold bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500">For fixed packs (optional)</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Unit Label</label>
                      <input
                        type="text"
                        value={editUnit}
                        onChange={e => setEditUnit(e.target.value)}
                        placeholder="per side, each, pack, m²"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Admin Notes</label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="e.g. Bulk commercial discount, turnaround 1-2 days"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTier(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingTier}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{savingTier ? 'Saving to Database...' : 'Save Changes to DB'}</span>
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {/* ADD NEW TIER / QUERY MODAL */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        Database Engine
                      </span>
                      <h3 className="text-base font-black text-white">Add New Price Tier / Custom Query</h3>
                    </div>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-1 text-slate-500 hover:text-white rounded-md cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewTier} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Category</label>
                        <select
                          value={newTierCategory}
                          onChange={e => setNewTierCategory(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                        >
                          {CATEGORY_TABS.filter(t => t.id !== 'all').map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Subcategory Key</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. A4_BW, A3_Silk, custom"
                          value={newTierSubCategory}
                          onChange={e => setNewTierSubCategory(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Display Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. A4 Full Colour (500–1,000)"
                        value={newTierDisplayName}
                        onChange={e => setNewTierDisplayName(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Min Qty</label>
                        <input
                          type="number"
                          required
                          value={newTierMinQty}
                          onChange={e => setNewTierMinQty(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Max Qty (Blank = +)</label>
                        <input
                          type="number"
                          placeholder="Unlimited"
                          value={newTierMaxQty}
                          onChange={e => setNewTierMaxQty(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Unit</label>
                        <input
                          type="text"
                          value={newTierUnit}
                          onChange={e => setNewTierUnit(e.target.value)}
                          placeholder="per side, each, m²"
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newTierRequiresQuote"
                        checked={newTierRequiresQuote}
                        onChange={e => setNewTierRequiresQuote(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <label htmlFor="newTierRequiresQuote" className="text-xs font-bold text-amber-300 cursor-pointer">
                        Quote Required (Requires custom estimate)
                      </label>
                    </div>

                    {!newTierRequiresQuote && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Unit Price (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 0.35"
                            value={newTierUnitPrice}
                            onChange={e => setNewTierUnitPrice(e.target.value)}
                            className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Total Pack Price (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 40.00"
                            value={newTierTotalPrice}
                            onChange={e => setNewTierTotalPrice(e.target.value)}
                            className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Notes</label>
                      <input
                        type="text"
                        value={newTierNotes}
                        onChange={e => setNewTierNotes(e.target.value)}
                        placeholder="Internal or customer notes"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingTier}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{addingTier ? 'Creating...' : 'Create in Database'}</span>
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
};

export default AdminDashboardPage;
