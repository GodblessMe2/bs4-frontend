import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowLeft,
  Lock,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Loader2,
  Tag,
  MapPin,
  FileText,
  LogIn,
  X,
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import {
  authApi,
  ordersApi,
  couponsApi,
  paymentsApi,
  SavedAddressItem,
  PublicPaymentConfig,
} from '../api';

declare global {
  interface Window {
    paypal?: any;
  }
}

const detectCardBrand = (digits: string): string => {
  const clean = digits.replace(/\D/g, '');
  if (clean.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'Amex';
  return 'Visa';
};

const StripeLiveConfirmBridge: React.FC<{
  registerConfirmFn: (fn: ((clientSecret: string, billingName: string, billingEmail: string) => Promise<{ paymentIntentId: string }>) | null) => void;
}> = ({ registerConfirmFn }) => {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (!stripe || !elements) {
      registerConfirmFn(null);
      return;
    }

    registerConfirmFn(async (clientSecret: string, billingName: string, billingEmail: string) => {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card input is not ready yet.');
      }
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: billingName, email: billingEmail },
        },
      });
      if (error) {
        throw new Error(error.message || 'Stripe card authorisation failed.');
      }
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(`Unexpected payment status: ${paymentIntent?.status || 'unknown'}`);
      }
      return { paymentIntentId: paymentIntent.id };
    });

    return () => registerConfirmFn(null);
  }, [stripe, elements, registerConfirmFn]);

  return (
    <div className="p-3.5 rounded-lg border border-slate-300 bg-white">
      <CardElement
        options={{
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '14px',
              color: '#0f172a',
              '::placeholder': { color: '#94a3b8' },
            },
          },
        }}
      />
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobData, setJobData] = useState<any>(null);

  // Auth / customer state
  const [loggedInUser, setLoggedInUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('bs4_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');

  // Contact / Registration
  const [email, setEmail] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineLoginLoading, setInlineLoginLoading] = useState(false);
  const [inlineLoginError, setInlineLoginError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(true);
  const [password, setPassword] = useState('');

  // UK Shipping Address
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Bristol');
  const [postcode, setPostcode] = useState('');
  const [phone, setPhone] = useState('');

  // Billing Address
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [billingRecipientName, setBillingRecipientName] = useState('');
  const [billingCompanyName, setBillingCompanyName] = useState('');
  const [billingAddressLine1, setBillingAddressLine1] = useState('');
  const [billingAddressLine2, setBillingAddressLine2] = useState('');
  const [billingCity, setBillingCity] = useState('Bristol');
  const [billingPostcode, setBillingPostcode] = useState('');

  // Delivery & Coupon state
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Payment & Terms
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const stripeConfirmRef = useRef<
    ((clientSecret: string, billingName: string, billingEmail: string) => Promise<{ paymentIntentId: string }>) | null
  >(null);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const [paypalSdkReady, setPaypalSdkReady] = useState(false);
  const [paypalSdkError, setPaypalSdkError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const registerStripeConfirm = useCallback(
    (
      fn:
        | ((clientSecret: string, billingName: string, billingEmail: string) => Promise<{ paymentIntentId: string }>)
        | null
    ) => {
      stripeConfirmRef.current = fn;
    },
    []
  );

  // Submission state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'redirecting'>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applySavedAddress = (addr: SavedAddressItem) => {
    setSelectedAddressId(addr.id || 'saved');
    setRecipientName(addr.recipientName || '');
    setCompanyName(addr.companyName || '');
    setAddressLine1(addr.addressLine1 || '');
    setAddressLine2(addr.addressLine2 || '');
    setCity(addr.city || '');
    setPostcode(addr.postcode || '');
    if (addr.phone) setPhone(addr.phone);
  };

  const loadCustomerAddresses = async () => {
    if (!localStorage.getItem('bs4_token')) return;
    try {
      const addresses = await authApi.getAddresses();
      setSavedAddresses(addresses);
      if (addresses.length > 0) {
        const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
        applySavedAddress(defaultAddr);
      }
    } catch {
      // Non-fatal if addresses fail to load
    }
  };

  useEffect(() => {
    const savedJob = sessionStorage.getItem('bs4_current_job');
    if (!savedJob) {
      navigate('/copyshop');
      return;
    }
    const parsed = JSON.parse(savedJob);
    setJobData(parsed);

    if (parsed.pricing?.shippingMethod === 'express') {
      setShippingMethod('express');
    } else {
      setShippingMethod('standard');
    }

    if (parsed.pricing?.couponCode) {
      setAppliedCouponCode(parsed.pricing.couponCode);
      setCouponInput(parsed.pricing.couponCode);
      setDiscountAmount(Number(parsed.pricing.discountAmount || 0));
    }

    if (parsed.customer) {
      if (parsed.customer.email) setEmail(parsed.customer.email);
      if (parsed.customer.name) setRecipientName(parsed.customer.name);
      if (parsed.customer.phone) setPhone(parsed.customer.phone);
    }

    const token = localStorage.getItem('bs4_token');
    if (token) {
      const rawUser = localStorage.getItem('bs4_user');
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          setLoggedInUser(u);
          if (u.email && !parsed.customer?.email) setEmail(u.email);
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          if (fullName && !parsed.customer?.name) setRecipientName(fullName);
          if (u.phone && !parsed.customer?.phone) setPhone(u.phone);
        } catch {
          // ignore invalid json
        }
      }
      loadCustomerAddresses();
    }

    paymentsApi
      .getConfig()
      .then((cfg) => {
        setPaymentConfig(cfg);
        if (cfg.stripeLiveElements && cfg.stripePublishableKey) {
          setStripePromise(loadStripe(cfg.stripePublishableKey));
        }
      })
      .catch(() => {
        // Fallback silently to test mode defaults
      });
  }, [navigate]);

  useEffect(() => {
    if (paymentMethod !== 'paypal' || !paymentConfig?.paypalClientId) {
      return;
    }

    if (window.paypal) {
      setPaypalSdkReady(true);
      return;
    }

    const scriptId = 'bs4-paypal-sdk-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setPaypalSdkReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paymentConfig.paypalClientId
    )}&currency=GBP&intent=capture`;
    script.async = true;
    script.onload = () => {
      setPaypalSdkReady(true);
      setPaypalSdkError(null);
    };
    script.onerror = () => {
      setPaypalSdkError('Unable to load live PayPal popup SDK in this browser. You can still test PayPal Sandbox order creation below.');
    };
    document.body.appendChild(script);
  }, [paymentMethod, paymentConfig?.paypalClientId]);

  // Live financial summary calculation
  const pricingSummary = useMemo(() => {
    if (!jobData) {
      return { subtotal: 0, discount: 0, shippingCost: 0, totalPayable: 0 };
    }
    const isQuoteOrder = Boolean(jobData.isQuoteOrder);
    const subtotal = Number(jobData.pricing?.subtotal || 0);
    const discount = isQuoteOrder ? 0 : Math.min(Number(discountAmount || 0), subtotal);
    const afterDiscount = Math.max(0, Number((subtotal - discount).toFixed(2)));
    const shippingCost =
      shippingMethod === 'express'
        ? 6.99
        : isQuoteOrder || afterDiscount >= 30
        ? 0
        : 3.5;
    const totalPayable = Number((afterDiscount + shippingCost).toFixed(2));
    return { subtotal, discount, shippingCost, totalPayable };
  }, [jobData, discountAmount, shippingMethod]);

  const handleEmailBlur = async () => {
    if (!email || !email.includes('@') || loggedInUser) return;
    try {
      const data = await authApi.checkEmail(email.trim());
      setIsReturningUser(Boolean(data.isRegistered));
      if (data.isRegistered) {
        setCreateAccount(false);
      }
    } catch {
      setIsReturningUser(false);
    }
  };

  const handleInlineLogin = async () => {
    if (!email || !inlinePassword) {
      setInlineLoginError('Enter your password to sign in.');
      return;
    }
    setInlineLoginLoading(true);
    setInlineLoginError(null);
    try {
      const auth = await authApi.login({ email: email.trim(), password: inlinePassword });
      localStorage.setItem('bs4_token', auth.token);
      localStorage.setItem('bs4_user', JSON.stringify(auth.user));
      window.dispatchEvent(new Event('bs4-auth-change'));
      setLoggedInUser(auth.user);
      setIsReturningUser(false);
      setCreateAccount(false);
      setInlinePassword('');
      const fullName = `${auth.user.firstName || ''} ${auth.user.lastName || ''}`.trim();
      if (fullName && !recipientName) setRecipientName(fullName);
      if (auth.user.phone && !phone) setPhone(auth.user.phone);
      await loadCustomerAddresses();
    } catch (err: any) {
      setInlineLoginError(err.response?.data?.message || 'Incorrect password. Please try again.');
    } finally {
      setInlineLoginLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !jobData) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponMessage(null);
    try {
      const res = await couponsApi.validate(couponInput.trim(), Number(jobData.pricing?.subtotal || 0));
      if (res.valid) {
        setAppliedCouponCode(res.coupon?.code || couponInput.trim().toUpperCase());
        setDiscountAmount(Number(res.discountAmount || 0));
        setCouponMessage(`Code applied: -${formatGBP(Number(res.discountAmount || 0))} off`);
      } else {
        setCouponError(res.message || 'Coupon could not be applied.');
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon code.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setDiscountAmount(0);
    setCouponInput('');
    setCouponMessage(null);
    setCouponError(null);
  };

  const validateBeforeOrder = (requireStripeInputs: boolean): string | null => {
    if (!email.trim() || !email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (!recipientName || !addressLine1 || !city || !postcode || !phone) {
      return 'Please fill in all required UK delivery fields.';
    }
    if (!billingSameAsDelivery && (!billingRecipientName || !billingAddressLine1 || !billingCity || !billingPostcode)) {
      return 'Please complete your UK billing address fields.';
    }
    if (!acceptedTerms) {
      return 'Please accept the Print Production & Delivery Terms before paying.';
    }
    if (!loggedInUser && createAccount && password.length < 6) {
      return 'Password must be at least 6 characters to create an account.';
    }
    if (
      requireStripeInputs &&
      !paymentConfig?.stripeLiveElements &&
      (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim())
    ) {
      return 'Please enter your test card details or switch to PayPal.';
    }
    const uploadedFileIds =
      jobData?.files?.map((f: any) => f.id || f.serverFileId).filter(Boolean) || [];
    if (!jobData?.isQuoteOrder && uploadedFileIds.length === 0) {
      return 'Your uploaded PDF session has expired or contains no server files. Please re-upload your PDF in the Copy Shop.';
    }
    return null;
  };

  const createPendingOrderOnServer = async (provider: 'stripe' | 'paypal') => {
    const uploadedFileIds =
      jobData.files?.map((f: any) => f.id || f.serverFileId).filter(Boolean) || [];

    const deliveryAddressObj = {
      recipientName,
      companyName: companyName || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      city,
      postcode: postcode.toUpperCase(),
      country: 'United Kingdom',
      phone,
    };

    const billingAddressObj = billingSameAsDelivery
      ? deliveryAddressObj
      : {
          recipientName: billingRecipientName,
          companyName: billingCompanyName || undefined,
          addressLine1: billingAddressLine1,
          addressLine2: billingAddressLine2 || undefined,
          city: billingCity,
          postcode: billingPostcode.toUpperCase(),
          country: 'United Kingdom',
          phone,
        };

    const orderPayload: any = {
      quoteId: jobData.isQuoteOrder ? jobData.quoteId : undefined,
      customerEmail: email.trim(),
      customerFirstName: recipientName.split(' ')[0] || recipientName,
      customerLastName: recipientName.split(' ').slice(1).join(' ') || 'Customer',
      customerPhone: phone,
      createAccount: !loggedInUser && createAccount,
      password: !loggedInUser && createAccount ? password : undefined,
      shippingMethod,
      shippingAddress: deliveryAddressObj,
      billingAddress: billingAddressObj,
      couponCode: !jobData.isQuoteOrder ? appliedCouponCode || undefined : undefined,
      items: [
        {
          jobName:
            jobData.files?.length > 1
              ? `${jobData.files[0]?.name || 'Document'} (+${jobData.files.length - 1} more)`
              : jobData.files?.[0]?.name || jobData.quoteNumber || 'Document Print Job',
          copies: jobData.config?.copies || 1,
          fileIds: uploadedFileIds,
          config: jobData.config,
        },
      ],
      paymentProvider: provider,
    };

    const data = await ordersApi.createOrder(orderPayload);
    const placedOrder = data.order || data;

    if (data.userToken) {
      localStorage.setItem('bs4_token', data.userToken);
      localStorage.setItem(
        'bs4_user',
        JSON.stringify({
          id: placedOrder.userId,
          email: email.trim(),
          firstName: orderPayload.customerFirstName,
          lastName: orderPayload.customerLastName,
          phone,
          role: 'customer',
        })
      );
      window.dispatchEvent(new Event('bs4-auth-change'));
    }

    if ((loggedInUser || data.userToken) && selectedAddressId === 'new' && saveNewAddress) {
      try {
        await authApi.saveAddress({
          label: newAddressLabel.trim() || 'Delivery Address',
          ...deliveryAddressObj,
          isDefault: savedAddresses.length === 0,
        });
      } catch {
        // Non-fatal
      }
    }

    return {
      placedOrder,
      clientSecret: data.clientSecret as string | null,
      paymentIntentId: data.paymentIntentId as string | null,
    };
  };

  const finalizeOrderNavigation = (paidOrder: any, orderNumberFallback: string) => {
    sessionStorage.setItem('bs4_completed_order', JSON.stringify(paidOrder));
    sessionStorage.removeItem('bs4_current_job');
    navigate(`/order-confirmation/${paidOrder?.orderNumber || orderNumberFallback}`);
  };

  const pendingPayPalOrderRef = useRef<{ orderId: string; orderNumber: string } | null>(null);
  const validateRef = useRef(validateBeforeOrder);
  const createOrderRef = useRef(createPendingOrderOnServer);
  validateRef.current = validateBeforeOrder;
  createOrderRef.current = createPendingOrderOnServer;

  useEffect(() => {
    if (paymentMethod !== 'paypal' || !paypalSdkReady || !window.paypal || !paypalContainerRef.current) {
      return;
    }

    const container = paypalContainerRef.current;
    container.innerHTML = '';

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      },
      onClick: (_data: any, actions: any) => {
        const validationError = validateRef.current(false);
        if (validationError) {
          setErrorMessage(validationError);
          return actions.reject();
        }
        setErrorMessage(null);
        return actions.resolve();
      },
      createOrder: async () => {
        setIsProcessing(true);
        setPaymentStep('processing');
        try {
          const { placedOrder } = await createOrderRef.current('paypal');
          pendingPayPalOrderRef.current = {
            orderId: placedOrder.id,
            orderNumber: placedOrder.orderNumber,
          };
          const pp = await paymentsApi.createPayPalOrder(placedOrder.id);
          return pp.paypalOrderId;
        } catch (err: any) {
          setErrorMessage(err.response?.data?.message || err.message || 'Unable to initialise PayPal order.');
          setIsProcessing(false);
          setPaymentStep('form');
          throw err;
        }
      },
      onApprove: async (data: any) => {
        setPaymentStep('redirecting');
        try {
          const target = pendingPayPalOrderRef.current;
          if (!target) {
            throw new Error('Order session reference was lost.');
          }
          const paidOrder = await paymentsApi.capturePayPalOrder(target.orderId, data.orderID);
          finalizeOrderNavigation(paidOrder, target.orderNumber);
        } catch (err: any) {
          setErrorMessage(err.response?.data?.message || err.message || 'PayPal capture failed.');
          setIsProcessing(false);
          setPaymentStep('form');
        }
      },
      onCancel: () => {
        setIsProcessing(false);
        setPaymentStep('form');
        setErrorMessage('PayPal payment popup was closed before approval.');
      },
      onError: (err: any) => {
        setIsProcessing(false);
        setPaymentStep('form');
        setErrorMessage(err?.message || 'PayPal checkout encountered an error.');
      },
    });

    if (buttons.isEligible()) {
      buttons.render(container).catch(() => {
        setPaypalSdkError('PayPal button could not render cleanly in this view.');
      });
    }

    return () => {
      container.innerHTML = '';
    };
  }, [paymentMethod, paypalSdkReady, pricingSummary.totalPayable]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateBeforeOrder(paymentMethod === 'stripe');
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // 1. Create order in MySQL via backend API
      const { placedOrder, clientSecret, paymentIntentId } = await createPendingOrderOnServer(paymentMethod);

      setPaymentStep('redirecting');

      if (paymentMethod === 'stripe') {
        if (paymentConfig?.stripeLiveElements && stripeConfirmRef.current && clientSecret) {
          const { paymentIntentId: confirmedId } = await stripeConfirmRef.current(
            clientSecret,
            recipientName,
            email.trim()
          );
          const paidOrder = await paymentsApi.verifyStripePayment({
            orderId: placedOrder.id,
            paymentIntentId: confirmedId,
          });
          finalizeOrderNavigation(paidOrder || placedOrder, placedOrder.orderNumber);
          return;
        }

        const digits = cardNumber.replace(/\D/g, '');
        const cardLast4 = digits.slice(-4) || '4242';
        const cardBrand = detectCardBrand(digits || '4242');
        const paidOrder = await paymentsApi.verifyStripePayment({
          orderId: placedOrder.id,
          paymentIntentId: paymentIntentId || placedOrder.paymentId,
          cardBrand,
          cardLast4,
          method: 'card',
        });
        finalizeOrderNavigation(paidOrder || placedOrder, placedOrder.orderNumber);
        return;
      }

      // PayPal Sandbox API fallback when user clicks primary CTA directly
      const ppOrder = await paymentsApi.createPayPalOrder(placedOrder.id);
      if (ppOrder.approvalUrl) {
        pendingPayPalOrderRef.current = {
          orderId: placedOrder.id,
          orderNumber: placedOrder.orderNumber,
        };
        setErrorMessage(
          `PayPal Sandbox order (${ppOrder.paypalOrderId}) created! Use the yellow PayPal Smart Button above to complete checkout.`
        );
        setIsProcessing(false);
        setPaymentStep('form');
        return;
      }

      finalizeOrderNavigation(placedOrder, placedOrder.orderNumber);
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          'Failed to submit order. Please ensure backend is running and details are valid.'
      );
      setIsProcessing(false);
      setPaymentStep('form');
    }
  };

  if (!jobData) return null;

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to={jobData.isQuoteOrder ? '/account' : '/copyshop'}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />{' '}
            {jobData.isQuoteOrder ? 'Back to My Account' : 'Back to Configurator'}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <h1 className="text-2xl font-black text-slate-900">Delivery & Secure Checkout</h1>
            {jobData.isQuoteOrder && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                Custom Quote Approved • {jobData.quoteNumber}
              </span>
            )}
          </div>
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
                {loggedInUser ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <UserCheck className="w-3.5 h-3.5" /> Signed in as {loggedInUser.firstName || loggedInUser.email}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Order tracking updates</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  readOnly={Boolean(loggedInUser)}
                  placeholder="e.g. yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  className={`w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden ${
                    loggedInUser ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              {/* Returning User Inline Sign-In */}
              {!loggedInUser && isReturningUser && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-blue-900">
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Welcome back!</span> This email has a registered BS4 account. Sign in below to load your saved UK addresses, or continue as a guest.
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="Enter account password"
                      value={inlinePassword}
                      onChange={(e) => setInlinePassword(e.target.value)}
                      className="flex-1 text-xs p-2.5 rounded-lg border border-blue-200 bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={inlineLoginLoading}
                      onClick={handleInlineLogin}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {inlineLoginLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                      Sign In
                    </button>
                  </div>
                  {inlineLoginError && (
                    <p className="text-xs font-semibold text-red-600">{inlineLoginError}</p>
                  )}
                </div>
              )}

              {/* Create account option for guests */}
              {!loggedInUser && !isReturningUser && (
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
                        Choose Password *
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

              {/* Saved Address Picker for logged-in users */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Choose a saved delivery address:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === (addr.id || 'saved');
                      return (
                        <button
                          key={addr.id || `${addr.postcode}-${addr.addressLine1}`}
                          type="button"
                          onClick={() => applySavedAddress(addr)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>{addr.label || 'Saved Address'}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600 mt-1 truncate">{addr.recipientName}</div>
                          <div className="text-slate-500 truncate">
                            {addr.addressLine1}, {addr.city} {addr.postcode}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId('new');
                        setAddressLine1('');
                        setAddressLine2('');
                        setPostcode('');
                      }}
                      className={`text-left p-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center ${
                        selectedAddressId === 'new'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      + Enter a New Delivery Address
                    </button>
                  </div>
                </div>
              )}

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Clifton Design Studio"
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
                  placeholder="Apartment, suite, building"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UK Postcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BS4 3BS"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="07700 900123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {(loggedInUser || createAccount) && selectedAddressId === 'new' && (
                savedAddresses.length >= 3 ? (
                  <div className="pt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    You have reached the maximum of 3 saved addresses. To save this new address permanently, edit or delete an existing one in{' '}
                    <Link to="/account" className="font-bold underline">My Account</Link>.
                  </div>
                ) : (
                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      Save this address to my address book ({savedAddresses.length}/3)
                    </label>
                    {saveNewAddress && (
                      <input
                        type="text"
                        placeholder="Label (e.g. Studio, Office)"
                        value={newAddressLabel}
                        onChange={(e) => setNewAddressLabel(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                      />
                    )}
                  </div>
                )
              )}

              {/* Billing Address Toggle */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={billingSameAsDelivery}
                    onChange={(e) => setBillingSameAsDelivery(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Billing address is the same as delivery address
                </label>

                {!billingSameAsDelivery && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Billing Address Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Billing Name *"
                        value={billingRecipientName}
                        onChange={(e) => setBillingRecipientName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Company Name (Optional)"
                        value={billingCompanyName}
                        onChange={(e) => setBillingCompanyName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Billing Address Line 1 *"
                      value={billingAddressLine1}
                      onChange={(e) => setBillingAddressLine1(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Billing Address Line 2 (Optional)"
                      value={billingAddressLine2}
                      onChange={(e) => setBillingAddressLine2(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="City *"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Postcode *"
                        value={billingPostcode}
                        onChange={(e) => setBillingPostcode(e.target.value.toUpperCase())}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. UK Delivery Option */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                3. Delivery Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShippingMethod('standard')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    shippingMethod === 'standard'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Standard Tracked UK</span>
                    <span>
                      {jobData.isQuoteOrder || pricingSummary.subtotal - pricingSummary.discount >= 30
                        ? 'FREE'
                        : '£3.50'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    2–3 working days via Royal Mail / studio dispatch (Free over £30)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShippingMethod('express')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    shippingMethod === 'express'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Express Next Working Day</span>
                    <span>£6.99</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Priority same-day press queue & next working day courier
                  </p>
                </button>
              </div>
            </div>

            {/* 4. Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  4. Payment Method
                </h2>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> 256-bit SSL Encrypted
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    paymentMethod === 'stripe'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" /> Card / Apple Pay / Google Pay
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Visa, Mastercard, UK Debit (Stripe)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    paymentMethod === 'paypal'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">PayPal Express</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Pay with PayPal Balance / Bank</div>
                  </div>
                </button>
              </div>

              {paymentMethod === 'stripe' ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      Stripe {paymentConfig?.stripeMode === 'live' ? 'Live' : 'Test Mode'}
                    </span>
                    {!paymentConfig?.stripeLiveElements && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber('4242 4242 4242 4242');
                            setCardExpiry('12 / 28');
                            setCardCvc('424');
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300"
                        >
                          Fill Visa 4242
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber('5555 5555 5555 4444');
                            setCardExpiry('11 / 28');
                            setCardCvc('123');
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300"
                        >
                          Fill Mastercard 4444
                        </button>
                      </div>
                    )}
                  </div>

                  {paymentConfig?.stripeLiveElements && stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <StripeLiveConfirmBridge registerConfirmFn={registerStripeConfirm} />
                    </Elements>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card Number</label>
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">CVC</label>
                          <input
                            type="text"
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Running in Stripe Test Card mode. Transaction ID &amp; card brand/last 4 digits are recorded in Order Tracking.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 mt-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      PayPal {paymentConfig?.paypalMode === 'live' ? 'Live' : 'Sandbox Active'}
                    </span>
                    <span className="text-[11px] text-amber-900 font-medium">GBP (£) • Instant Capture</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Ensure your delivery details and terms checkbox are filled, then authorise payment using your PayPal Sandbox account below:
                  </p>
                  {paymentConfig?.paypalClientId ? (
                    <>
                      <div ref={paypalContainerRef} className="min-h-[48px]" />
                      {!paypalSdkReady && !paypalSdkError && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Loading PayPal Sandbox Checkout buttons...</span>
                        </div>
                      )}
                      {paypalSdkError && (
                        <div className="text-xs text-amber-800 bg-white/80 border border-amber-200 rounded-lg p-2.5">
                          {paypalSdkError}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-amber-900 font-medium">
                      PayPal credentials are not configured on the backend `.env` yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Review (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Order Review ({jobData.files?.length || 1} {jobData.files?.length === 1 ? 'File' : 'Files'})
              </h2>

              {/* Uploaded Files List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(jobData.files || []).map((file: any, idx: number) => (
                  <div key={file.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {file.pageCount || file.pages || '?'} pages
                        </div>
                      </div>
                    </div>
                    {file.id && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Job Specs Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="font-bold text-slate-900">Print Specifications</div>
                <div className="text-slate-600">
                  {jobData.config?.paperSize} • {jobData.config?.paperType} •{' '}
                  {jobData.config?.colorMode === 'bw' ? 'B&W' : 'Full Colour'}
                </div>
                <div className="text-slate-500">
                  {jobData.config?.sides === 'double' ? 'Double-sided' : 'Single-sided'} •{' '}
                  {jobData.config?.pagesPerSheet || 1} page/sheet •{' '}
                  {jobData.config?.orientation || 'auto'} • {jobData.config?.copies || 1} copy/copies
                </div>
                {jobData.config?.binding !== 'none' && (
                  <div className="text-blue-700 font-semibold capitalize">
                    Finishing: {jobData.config?.binding}
                    {jobData.config?.frontCover ? ' + Front Cover' : ''}
                    {jobData.config?.backCover ? ' + Back Cover' : ''}
                  </div>
                )}
              </div>

              {/* Coupon Code Input */}
              {!jobData.isQuoteOrder && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" /> Promo / Coupon Code
                  </label>
                  {appliedCouponCode ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <span className="font-bold text-emerald-800">
                        {appliedCouponCode} applied (-{formatGBP(pricingSummary.discount)})
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-slate-500 hover:text-red-600"
                        title="Remove coupon"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BRISTOL10"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 uppercase focus:border-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isApplyingCoupon ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponMessage && <p className="text-xs font-semibold text-emerald-700">{couponMessage}</p>}
                  {couponError && <p className="text-xs font-semibold text-red-600">{couponError}</p>}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2.5 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>{jobData.isQuoteOrder ? 'Approved Quote Price' : 'Print Subtotal (inc. VAT)'}</span>
                  <span className="font-semibold text-slate-900">{formatGBP(pricingSummary.subtotal)}</span>
                </div>
                {pricingSummary.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({appliedCouponCode})</span>
                    <span>-{formatGBP(pricingSummary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>UK Delivery ({shippingMethod === 'express' ? 'Express Courier' : 'Standard'})</span>
                  <span className="font-semibold text-slate-900">
                    {pricingSummary.shippingCost === 0 ? 'FREE' : formatGBP(pricingSummary.shippingCost)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Total to Pay</span>
                  <span className="text-2xl font-black text-blue-600">
                    {formatGBP(pricingSummary.totalPayable)}
                  </span>
                </div>
              </div>

              {/* Terms Acceptance */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                />
                <span>
                  I confirm that my PDF layout is ready for print and accept BS4 Copy & Print&apos;s production and UK delivery terms.
                </span>
              </label>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              {paymentMethod === 'paypal' && paypalSdkReady ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-center font-semibold">
                  Use the PayPal Sandbox button under Section 4 (Payment Method) to authorise &amp; pay{' '}
                  {formatGBP(pricingSummary.totalPayable)}.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {paymentStep === 'processing'
                        ? 'Submitting Order & Processing...'
                        : 'Finalising Payment...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Complete Order • {formatGBP(pricingSummary.totalPayable)}
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Money-back print guarantee</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-600" /> Tracked UK Mail</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
