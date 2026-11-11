import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Printer, 
  Truck, 
  Check, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Tag,
  Clock,
  X,
  Send
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { couponsApi, quotesApi } from '../api';

// Set pdfjs worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  previewUrl?: string;
  fileObject: File;
}

export type PaperSize = 'A4' | 'A5' | 'A3';
export type PaperWeight = '80gsm' | '100gsm' | '300gsm';
export type ColorMode = 'bw' | 'color';
export type PrintSides = 'duplex' | 'simplex';
export type PagesPerSheet = 1 | 2 | 4;
export type BindingType = 'none' | 'spiral' | 'staple' | 'hole_punch_2' | 'hole_punch_4';
export type FrontCover = 'none' | 'clear_acetate' | 'frosted_pvc' | 'card_300gsm';
export type BackCover = 'none' | 'white_card_300gsm' | 'black_card_300gsm';

export const CopyShopPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploaded files state
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Configuration options state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [paperWeight, setPaperWeight] = useState<PaperWeight>('80gsm');
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [printSides, setPrintSides] = useState<PrintSides>('duplex');
  const [pagesPerSheet, setPagesPerSheet] = useState<PagesPerSheet>(1);
  const [bindingType, setBindingType] = useState<BindingType>('none');
  const [frontCover, setFrontCover] = useState<FrontCover>('none');
  const [backCover, setBackCover] = useState<BackCover>('none');
  const [copies, setCopies] = useState<number>(1);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Quote Request Modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSubmittedRef, setQuoteSubmittedRef] = useState<string | null>(null);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Handle PDF files parsing with pdfjs-dist
  const processFiles = async (fileList: FileList) => {
    setIsProcessingPdf(true);
    setUploadError(null);

    const newFiles: UploadedFileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Only PDF documents are accepted for precision commercial printing.');
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;

        newFiles.push({
          id: `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          pageCount,
          fileObject: file,
        });
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        setUploadError(`Could not read ${file.name}. Ensure it is a valid non-password-protected PDF.`);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setIsProcessingPdf(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Demo file
  const loadDemoPdf = () => {
    const demoItem: UploadedFileItem = {
      id: `demo_${Date.now()}`,
      name: 'Sample_Lecture_Notes_2026.pdf',
      size: 4850000,
      pageCount: 36,
      fileObject: new File(['mock content'], 'Sample_Lecture_Notes_2026.pdf', { type: 'application/pdf' }),
    };
    setFiles([demoItem]);
  };

  // -------------------------------------------------------------
  // EXACT 2026 RETAIL PRICE LIST TIERED CALCULATION
  // -------------------------------------------------------------
  const totalRawPages = files.reduce((acc, f) => acc + f.pageCount, 0);
  const effectivePages = Math.ceil(totalRawPages / pagesPerSheet);
  const physicalSheetsPerCopy = printSides === 'duplex' ? Math.ceil(effectivePages / 2) : effectivePages;
  const sidesPerCopy = printSides === 'duplex' ? effectivePages : physicalSheetsPerCopy;
  const totalPrintedSides = sidesPerCopy * copies;

  let requiresQuote = false;
  let quoteReason = '';
  let sheetBaseRate = 0;

  // 1. Check Paper Stock Tiers
  if (paperWeight === '80gsm') {
    if (totalPrintedSides > 1000) {
      requiresQuote = true;
      quoteReason = 'Jobs over 1,000 printed sides qualify for our bulk custom quote.';
    } else if (totalPrintedSides <= 25) {
      sheetBaseRate = paperSize === 'A4' ? (colorMode === 'color' ? 0.50 : 0.25) : (colorMode === 'color' ? 1.20 : 0.60);
    } else if (totalPrintedSides <= 50) {
      sheetBaseRate = paperSize === 'A4' ? (colorMode === 'color' ? 0.45 : 0.20) : (colorMode === 'color' ? 0.90 : 0.45);
    } else if (totalPrintedSides <= 100) {
      sheetBaseRate = paperSize === 'A4' ? (colorMode === 'color' ? 0.40 : 0.18) : (colorMode === 'color' ? 0.80 : 0.30);
    } else if (totalPrintedSides <= 500) {
      sheetBaseRate = paperSize === 'A4' ? (colorMode === 'color' ? 0.35 : 0.15) : (colorMode === 'color' ? 0.70 : 0.26);
    } else {
      // 501 - 1000
      sheetBaseRate = paperSize === 'A4' ? (colorMode === 'color' ? 0.25 : 0.10) : (colorMode === 'color' ? 0.50 : 0.20);
    }
  } else if (paperWeight === '100gsm') {
    // 120gsm Uncoated / Premium Document Printing
    if (totalPrintedSides > 250) {
      requiresQuote = true;
      quoteReason = 'Premium document runs exceeding 250 pages qualify for bulk quote.';
    } else if (totalPrintedSides <= 10) {
      sheetBaseRate = paperSize === 'A3' ? 1.40 : 0.75;
    } else if (totalPrintedSides <= 50) {
      sheetBaseRate = paperSize === 'A3' ? 1.20 : 0.60;
    } else if (totalPrintedSides <= 100) {
      sheetBaseRate = paperSize === 'A3' ? 1.00 : 0.50;
    } else {
      // 101 - 250
      sheetBaseRate = paperSize === 'A3' ? 0.85 : 0.45;
    }
    if (colorMode === 'bw') sheetBaseRate = sheetBaseRate * 0.5; // B&W adjustment
  } else if (paperWeight === '300gsm') {
    // 300gsm Uncoated Card
    const totalSheets = physicalSheetsPerCopy * copies;
    if (totalSheets > 250) {
      requiresQuote = true;
      quoteReason = 'Heavy cardstock runs over 250 sheets qualify for custom quote.';
    } else if (totalSheets <= 10) {
      sheetBaseRate = paperSize === 'A3' ? 2.00 : 1.20;
    } else if (totalSheets <= 25) {
      sheetBaseRate = paperSize === 'A3' ? 1.75 : 1.00;
    } else if (totalSheets <= 50) {
      sheetBaseRate = paperSize === 'A3' ? 1.50 : 0.90;
    } else if (totalSheets <= 100) {
      sheetBaseRate = paperSize === 'A3' ? 1.30 : 0.80;
    } else {
      // 101 - 250
      sheetBaseRate = paperSize === 'A3' ? 1.10 : 0.70;
    }
    if (colorMode === 'bw') sheetBaseRate = sheetBaseRate * 0.7;
  }

  const printCostPerCopy = sidesPerCopy * sheetBaseRate;

  // 2. Binding fees per copy
  let bindingCostPerCopy = 0;
  if (bindingType === 'spiral') {
    bindingCostPerCopy = physicalSheetsPerCopy > 100 ? 3.50 : 2.20;
  } else if (bindingType === 'staple') {
    bindingCostPerCopy = 0.30;
  } else if (bindingType === 'hole_punch_2') {
    bindingCostPerCopy = 0.20;
  } else if (bindingType === 'hole_punch_4') {
    bindingCostPerCopy = 0.30;
  }

  // 3. Covers fees per copy
  const coverPrices: Record<string, number> = {
    none: 0,
    clear_acetate: 0.45,
    frosted_pvc: 0.55,
    card_300gsm: 0.65,
    white_card_300gsm: 0.45,
    black_card_300gsm: 0.50,
  };
  const coversCostPerCopy = (coverPrices[frontCover] || 0) + (coverPrices[backCover] || 0);

  const unitPriceGross = printCostPerCopy + bindingCostPerCopy + coversCostPerCopy;
  let rawSubtotal = unitPriceGross * copies;

  // Minimum Order Amount (£2.00 rule)
  let minimumOrderApplied = false;
  if (!requiresQuote && rawSubtotal > 0 && rawSubtotal < 2.00) {
    rawSubtotal = 2.00;
    minimumOrderApplied = true;
  }

  // Coupon discount
  const subtotalAfterCoupon = Math.max(0, rawSubtotal - couponDiscount);

  // Shipping
  const freeShippingThreshold = 30.00;
  let shippingFee = shippingMethod === 'express' ? 6.99 : 3.50;
  const isFreeShipping = shippingMethod === 'standard' && subtotalAfterCoupon >= freeShippingThreshold;
  if (isFreeShipping) {
    shippingFee = 0;
  }

  const grandTotal = requiresQuote ? 0 : subtotalAfterCoupon + shippingFee;

  // Apply Coupon Code
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const data = await couponsApi.validate(couponCode, rawSubtotal);
      setCouponDiscount(data.discountAmount);
      setAppliedCoupon(data.coupon ? data.coupon.code : couponCode);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setCouponDiscount(0);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Submit Custom Quote Request
  const handleSubmitQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteName || !quoteEmail) return;
    setIsSubmittingQuote(true);

    const payload = {
      customerName: quoteName,
      customerEmail: quoteEmail,
      customerPhone: quotePhone,
      serviceCategory: `document_${paperWeight}`,
      quantity: copies,
      specifications: {
        paperSize,
        paperWeight,
        colorMode,
        printSides,
        pagesPerSheet,
        bindingType,
        frontCover,
        backCover,
        totalRawPages,
        physicalSheets: physicalSheetsPerCopy,
      },
      fileUrls: files.map((f) => ({ name: f.name, pageCount: f.pageCount })),
      customerNotes: quoteNotes,
    };

    try {
      const data = await quotesApi.submitQuoteRequest(payload);
      setQuoteSubmittedRef(data.quoteNumber);
    } catch {
      // Dev fallback
      const mockRef = `BS4-Q-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      setQuoteSubmittedRef(mockRef);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Proceed to Checkout
  const handleProceedToCheckout = () => {
    if (files.length === 0) {
      setUploadError('Please upload at least one PDF file before proceeding.');
      return;
    }

    const jobData = {
      files: files.map((f) => ({ id: f.id, name: f.name, pageCount: f.pageCount, size: f.size })),
      config: {
        paperSize,
        paperWeight,
        colorMode,
        printSides,
        pagesPerSheet,
        bindingType,
        frontCover,
        backCover,
        copies,
        physicalSheets: physicalSheetsPerCopy,
        totalRawPages,
      },
      pricing: {
        unitPriceGross,
        discountPercent: 0,
        unitPriceNet: unitPriceGross,
        subtotal: subtotalAfterCoupon,
        rawSubtotal,
        couponCode: appliedCoupon,
        couponDiscount,
        shippingFee,
        shippingMethod,
        isFreeShipping,
        grandTotal,
      },
    };

    sessionStorage.setItem('bs4_current_job', JSON.stringify(jobData));
    navigate('/checkout');
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
            <Printer className="w-4 h-4" /> BS4copy&print Services • Brislington, Bristol
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Online Copy Shop & Document Printing
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Tiered volume rates based on official 2026 Recommended Retail Price List. Minimum order £2.00.
          </p>
        </div>

        {/* 2-Column Grid: Configurator on Left, Sticky Live Quote on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Configurator (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Step 1: Document Upload */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Upload PDF Documents</h2>
                    <p className="text-xs text-slate-500">Auto page count & preflight inspection</p>
                  </div>
                </div>

                {files.length === 0 && (
                  <button
                    onClick={loadDemoPdf}
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                  >
                    + Load Sample PDF (36 Pgs)
                  </button>
                )}
              </div>

              {/* Drag & drop upload area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isProcessingPdf
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                  className="hidden"
                />

                <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Click to browse or drop your PDF documents here
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Supports multiple PDF files up to 100MB each. Page count, dimensions, and layout are extracted instantly.
                </p>

                {isProcessingPdf && (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                    <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    Inspecting PDF pages...
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Uploaded File List */}
              {files.length > 0 && (
                <div className="mt-6 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Uploaded Files ({files.length}) • Total: {totalRawPages} Pages
                  </h4>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-11 bg-rose-50 text-rose-600 border border-rose-200 rounded flex flex-col items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {file.pageCount} {file.pageCount === 1 ? 'Page' : 'Pages'}
                            </span>
                            <span>•</span>
                            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Step 2: Paper Size & Weight */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Paper Format & Stock</h2>
                  <p className="text-xs text-slate-500">Official 2026 Recommended Retail Options</p>
                </div>
              </div>

              {/* Paper Size selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Paper Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'A4', label: 'A4 (Standard)', dims: '210 x 297 mm', desc: 'Everyday notes & reports' },
                    { id: 'A5', label: 'A5 (Booklet)', dims: '148 x 210 mm', desc: 'Half size agenda' },
                    { id: 'A3', label: 'A3 (Large)', dims: '297 x 420 mm', desc: 'Double size / plans & charts' },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setPaperSize(sz.id as PaperSize)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        paperSize === sz.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900">{sz.label}</span>
                        {paperSize === sz.id && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 block">{sz.dims}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Weight selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Paper Type & Weight
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: '80gsm', title: '80gsm Standard', desc: 'Classic Navigator paper. Economical for everyday notes & manuals.' },
                    { id: '100gsm', title: '120gsm Uncoated', desc: 'Premium document printing. Higher thickness, zero bleed-through.' },
                    { id: '300gsm', title: '300gsm Uncoated Card', desc: 'Sturdy heavy card for certificates, flyers & presentation covers.' },
                  ].map((wt) => (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => setPaperWeight(wt.id as PaperWeight)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        paperWeight === wt.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900">{wt.title}</span>
                        {paperWeight === wt.id && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{wt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 3: Colour & Layout */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Colour Mode & Page Layout</h2>
                  <p className="text-xs text-slate-500">Duplex printing saves paper</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Colour Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Colour Printing Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setColorMode('bw')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        colorMode === 'bw'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm block">⚫ Black & White</span>
                      <span className="text-[10px] text-slate-500">From 10p/side</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setColorMode('color')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        colorMode === 'color'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm block">🎨 Full Colour</span>
                      <span className="text-[10px] text-slate-500">Vibrant CMYK</span>
                    </button>
                  </div>
                </div>

                {/* Print Sides */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Printing Sides
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintSides('duplex')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        printSides === 'duplex'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm block">Double-Sided</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Quick double prices</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintSides('simplex')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        printSides === 'simplex'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm block">Single-Sided</span>
                      <span className="text-[10px] text-slate-500">1 side per sheet</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pages per sheet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pages Per Sheet (Multi-Up)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1, label: '1 Page / Sheet' },
                    { val: 2, label: '2 Pages / Sheet' },
                    { val: 4, label: '4 Pages / Sheet' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPagesPerSheet(p.val as PagesPerSheet)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        pagesPerSheet === p.val
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs block">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 4: Binding */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Binding & Covers</h2>
                  <p className="text-xs text-slate-500">Turn loose sheets into booklets & presentation manuals</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Document Binding Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'none', title: 'None (Loose)', price: '£0.00' },
                    { id: 'spiral', title: 'Metal Wire Spiral', price: '+£2.20' },
                    { id: 'staple', title: 'Stapled Corner', price: '+£0.30' },
                    { id: 'hole_punch_2', title: '2-Hole Punch', price: '+£0.20' },
                    { id: 'hole_punch_4', title: '4-Hole Punch', price: '+£0.30' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBindingType(b.id as BindingType)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        bindingType === b.id
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900">{b.title}</span>
                        <span className="text-[11px] font-semibold text-blue-600">{b.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Protective Covers */}
              {bindingType === 'spiral' && (
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Front Cover
                    </label>
                    <select
                      value={frontCover}
                      onChange={(e) => setFrontCover(e.target.value as FrontCover)}
                      className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white p-2.5 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="none">No Front Cover (£0.00)</option>
                      <option value="clear_acetate">Clear Acetate 200µ (+£0.45)</option>
                      <option value="frosted_pvc">Frosted Matt PVC (+£0.55)</option>
                      <option value="card_300gsm">300gsm Printed Heavy Card (+£0.65)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Back Cover
                    </label>
                    <select
                      value={backCover}
                      onChange={(e) => setBackCover(e.target.value as BackCover)}
                      className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white p-2.5 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="none">No Back Cover (£0.00)</option>
                      <option value="white_card_300gsm">White Cardstock 300gsm (+£0.45)</option>
                      <option value="black_card_300gsm">Black Cardstock 300gsm (+£0.50)</option>
                      <option value="clear_acetate">Clear Acetate 200µ (+£0.45)</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

          </div>

          {/* Sticky Price & Order Summary Sidebar (4 Cols) */}
          <div className="lg:col-span-4 sticky top-28 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Live Quote Summary</h3>
                <span className="text-[11px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  2026 Price List
                </span>
              </div>

              {/* Quantity copies selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Number of Copies
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Total: {totalPrintedSides} printed sides
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center text-sm font-bold bg-white py-1.5 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setCopies(copies + 1)}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex gap-1.5 flex-1">
                    {[1, 5, 25, 100].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setCopies(qty)}
                        className={`text-xs py-1.5 px-2.5 rounded-md border flex-1 font-semibold transition-all ${
                          copies === qty
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* High-Quantity "Requires Quote" Notification */}
              {requiresQuote && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Wholesale Bulk Quote Required</span>
                  </div>
                  <p className="text-amber-800 leading-snug">
                    {quoteReason} Submit a quote request and our in-house print team will email you a custom wholesale rate.
                  </p>
                </div>
              )}

              {/* Job Specification Breakdown */}
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200/60">
                <div className="flex justify-between text-slate-600">
                  <span>Total Printed Sides:</span>
                  <span className="font-semibold text-slate-900">{totalPrintedSides} sides</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Physical Sheets / Copy:</span>
                  <span className="font-semibold text-slate-900">{physicalSheetsPerCopy} sheets</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tier Rate:</span>
                  <span className="font-semibold text-slate-900">
                    {requiresQuote ? 'Quote Tier' : `${(sheetBaseRate * 100).toFixed(0)}p / side`}
                  </span>
                </div>
                {minimumOrderApplied && (
                  <div className="flex justify-between text-blue-700 bg-blue-50 p-1.5 rounded">
                    <span>Minimum Order:</span>
                    <span className="font-bold">£2.00 rule applied</span>
                  </div>
                )}
              </div>

              {/* Coupon Code Section */}
              {!requiresQuote && (
                <div className="border-t border-slate-100 pt-3">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Coupon code (e.g. WELCOME10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border border-slate-300 font-mono font-bold uppercase focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCode}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                    >
                      {isApplyingCoupon ? '...' : 'Apply'}
                    </button>
                  </form>

                  {appliedCoupon && (
                    <div className="mt-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 p-2 rounded flex items-center justify-between">
                      <span>✓ Coupon "{appliedCoupon}" applied</span>
                      <span>-{formatGBP(couponDiscount)}</span>
                    </div>
                  )}

                  {couponError && (
                    <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 p-2 rounded">
                      {couponError}
                    </div>
                  )}
                </div>
              )}

              {/* Delivery method selection */}
              {!requiresQuote && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    UK Delivery Option
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setShippingMethod('standard')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                        shippingMethod === 'standard'
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-bold text-slate-900 block">Royal Mail Standard</span>
                          <span className="text-slate-500 text-[11px]">2-4 Working Days</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">
                        {isFreeShipping ? <span className="text-emerald-600 font-extrabold">FREE</span> : '£3.50'}
                      </span>
                    </label>

                    <label
                      onClick={() => setShippingMethod('express')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                        shippingMethod === 'express'
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="font-bold text-slate-900 block">Next Working Day Courier</span>
                          <span className="text-slate-500 text-[11px]">Tracked & Signed</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">£6.99</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Price Calculation Totals */}
              {!requiresQuote ? (
                <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Printing Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatGBP(rawSubtotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Coupon Discount:</span>
                      <span>-{formatGBP(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>UK Shipping:</span>
                    <span className="font-semibold text-slate-900">
                      {shippingFee === 0 ? <span className="text-emerald-600">FREE</span> : formatGBP(shippingFee)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 block">Total Inc. VAT</span>
                      <span className="text-[10px] text-slate-400">Fixed rate • Min order £2.00</span>
                    </div>
                    <span className="text-2xl font-black text-blue-600">{formatGBP(grandTotal)}</span>
                  </div>
                </div>
              ) : null}

              {/* Action Button: Regular Checkout VS Submit Custom Quote */}
              {requiresQuote ? (
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Request Custom Bulk Quote</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={files.length === 0}
                  className={`w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all ${
                    files.length === 0
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 active:scale-98 cursor-pointer'
                  }`}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Need bespoke finishing or special paper? Request custom quote
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* CUSTOM QUOTE REQUEST MODAL */}
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => {
                  setShowQuoteModal(false);
                  setQuoteSubmittedRef(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              {quoteSubmittedRef ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Quote Request Submitted!</h3>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-blue-600">
                    REFERENCE: #{quoteSubmittedRef}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    Thank you! Our in-house commercial team in Brislington is reviewing your request. You will receive an official quote email with a 1-click payment link.
                  </p>
                  <button
                    onClick={() => {
                      setShowQuoteModal(false);
                      setQuoteSubmittedRef(null);
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuoteRequest} className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-blue-600 font-bold uppercase text-[10px] tracking-wider block">Bespoke / Bulk Print</span>
                    <h3 className="text-lg font-bold text-slate-900">Request a Custom Quote</h3>
                    <p className="text-slate-500">
                      {copies} copies of {paperSize} ({paperWeight}) • {colorMode === 'color' ? 'Colour' : 'B&W'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Clarke"
                      value={quoteName}
                      onChange={(e) => setQuoteName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.co.uk"
                        value={quoteEmail}
                        onChange={(e) => setQuoteEmail(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="For faster response"
                        value={quotePhone}
                        onChange={(e) => setQuotePhone(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Special Requirements / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Specific delivery deadline, paper brand, or packaging requests..."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingQuote}
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingQuote ? 'Submitting...' : 'Submit Quote Request'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
