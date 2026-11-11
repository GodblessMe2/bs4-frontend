import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Lock, 
  ArrowLeft, 
  UserCheck, 
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { authApi, ordersApi } from '../api';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobData, setJobData] = useState<any>(null);

  // Customer contact state
  const [email, setEmail] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');

  // Shipping Address state (UK formatted)
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [phone, setPhone] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardName, setCardName] = useState('');
  const [processingStep, setProcessingStep] = useState<string>('');

  useEffect(() => {
    const savedJob = sessionStorage.getItem('bs4_current_job');
    if (!savedJob) {
      navigate('/copyshop');
      return;
    }
    const parsed = JSON.parse(savedJob);
    setJobData(parsed);
    if (parsed.customer) {
      if (parsed.customer.email) setEmail(parsed.customer.email);
      if (parsed.customer.name) setRecipientName(parsed.customer.name);
      if (parsed.customer.phone) setPhone(parsed.customer.phone);
    }
  }, [navigate]);

  // Check if email already belongs to a registered customer
  const handleEmailBlur = async () => {
    if (!email || !email.includes('@')) return;
    setIsCheckingEmail(true);
    try {
      const data: any = await authApi.checkEmail(email);
      if (data && (data.isRegistered || data.exists)) {
        setIsReturningUser(true);
      } else {
        setIsReturningUser(false);
      }
    } catch (err) {
      // Ignore if offline
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientName || !addressLine1 || !city || !postcode || !phone) {
      setErrorMessage('Please fill in all required delivery address fields.');
      return;
    }

    if (paymentMethod === 'stripe' && (!cardNumber || !cardExpiry || !cardCvc)) {
      setErrorMessage('Please fill in card details to complete payment.');
      return;
    }

    setIsSubmitting(true);
    setProcessingStep('Creating print order in system...');

    const orderPayload: any = {
      customerEmail: email,
      customerFirstName: recipientName.split(' ')[0] || recipientName,
      customerLastName: recipientName.split(' ').slice(1).join(' ') || 'Customer',
      customerPhone: phone,
      createAccount,
      password: createAccount ? password : undefined,
      shippingMethod: jobData.pricing?.shippingMethod || 'standard',
      shippingAddress: {
        recipientName,
        companyName,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode: postcode.toUpperCase(),
        country: 'GB',
        phone,
      },
      couponCode: jobData.pricing?.couponCode,
      items: [
        {
          jobName: jobData.files?.[0]?.name || 'Document Print Job',
          copies: jobData.config?.copies || 1,
          fileIds: jobData.files?.map((f: any) => f.id || f.serverFileId).filter(Boolean) || [],
          config: jobData.config,
        },
      ],
      paymentProvider: paymentMethod,
    };

    try {
      // 1. Create order in MySQL via backend API
      const data = await ordersApi.createOrder(orderPayload);
      const placedOrder = data.order || data;

      setProcessingStep('Authorizing payment and confirming with press...');

      // 2. Complete payment in backend (which records paymentStatus: succeeded and status: paid)
      const paidOrder = await ordersApi.confirmPayment(placedOrder.id);

      setProcessingStep('Payment succeeded! Redirecting to confirmation...');

      // Save confirmed order reference and clear current cart
      sessionStorage.setItem('bs4_confirmed_order', JSON.stringify(paidOrder || placedOrder));
      sessionStorage.removeItem('bs4_current_job');

      navigate(`/order-confirmation/${placedOrder.orderNumber}`);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
      setProcessingStep('');
    }
  };

  if (!jobData) return null;

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link to="/copyshop" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Configurator
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Delivery & Secure Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Customer Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  1. Contact Information
                </h2>
                <span className="text-xs text-slate-500">Order tracking updates</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Returning User Notification */}
              {isReturningUser && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Welcome back!</span> We found your account. Complete your order below and it will automatically attach to your order history.
                  </div>
                </div>
              )}

              {/* Create account option for guests */}
              {!isReturningUser && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    Save my details & create an account for 1-click reorders
                  </label>

                  {createAccount && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Choose Password
                      </label>
                      <input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. UK Delivery Address */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  2. UK Delivery Address
                </h2>
                <span className="text-xs text-slate-500">United Kingdom Only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name / Recipient *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / University (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dept of Economics"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  placeholder="House number and street name"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  placeholder="Apartment, suite, unit, flat"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Town / City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bristol"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">County (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Somerset"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UK Postcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BS4 3AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 uppercase focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="For courier delivery SMS tracking"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  3. Payment Method
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> 256-bit Encrypted
                </div>
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setPaymentMethod('stripe')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Debit / Credit Card & Apple Pay</span>
                      <span className="text-xs text-slate-500">Visa, Mastercard, Apple Pay, Google Pay via Stripe</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'stripe'}
                    onChange={() => setPaymentMethod('stripe')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-indigo-700 font-black italic">P</div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">PayPal</span>
                      <span className="text-xs text-slate-500">Pay directly with your PayPal balance or bank</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </label>

                {/* Card input details for Stripe */}
                {paymentMethod === 'stripe' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Card Details</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                        Test Mode Active
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="4242 •••• •••• 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full text-xs font-mono p-2.5 bg-white rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full text-xs font-mono p-2.5 bg-white rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">CVC / CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full text-xs font-mono p-2.5 bg-white rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-4">
                Order Review
              </h3>

              {/* Item Card */}
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="w-9 h-11 bg-blue-100 text-blue-700 rounded flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {jobData.files[0]?.name || 'Document Print Job'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {jobData.config.copies} {jobData.config.copies > 1 ? 'copies' : 'copy'} • {jobData.config.paperSize} ({jobData.config.paperWeight}) • {jobData.config.colorMode === 'color' ? 'Colour' : 'B&W'} • {jobData.config.bindingType.toUpperCase()}
                  </p>
                </div>
                <div className="text-xs font-black text-slate-900">
                  {formatGBP(jobData.pricing.subtotal)}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-200 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>Printing & Materials:</span>
                  <span className="font-semibold text-slate-900">{formatGBP(jobData.pricing.subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>UK Courier Delivery ({jobData.pricing.shippingMethod.toUpperCase()}):</span>
                  <span className="font-semibold text-slate-900">
                    {jobData.pricing.shippingFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      formatGBP(jobData.pricing.shippingFee)
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-extrabold text-slate-900 block">Total Due</span>
                    <span className="text-[10px] text-slate-400">Includes all UK VAT and packaging</span>
                  </div>
                  <span className="text-2xl font-black text-blue-600">
                    {formatGBP(jobData.pricing.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{processingStep || 'Processing Order...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay {formatGBP(jobData.pricing.grandTotal)} & Print</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 text-center space-y-1">
                <p>By placing this order you agree to our Terms of Print Service.</p>
                <p>Commercial in-house dispatch within 24 business hours.</p>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
