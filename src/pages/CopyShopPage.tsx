import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  X,
  Send,
  Eye,
  Edit2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { formatGBP } from '../lib/utils';
import { couponsApi, quotesApi, documentsApi, pricingApi, PriceTierItem } from '../api';
import { renderPdfPageToDataUrl, createSamplePdfFile } from '../lib/pdfUtils';

// Set pdfjs worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

interface UploadedFileItem {
  id: string;
  serverFileId?: string;
  secureUrl?: string;
  name: string;
  size: number;
  pageCount: number;
  thumbnailUrl?: string;
  arrayBuffer?: ArrayBuffer;
  uploadStatus: 'uploading' | 'ready' | 'local';
  uploadProgress: number;
  fileObject: File;
}

export type PaperSize = 'A4' | 'A5' | 'A3';
export type PaperWeight = '80gsm' | '100gsm' | '300gsm';
export type ColorMode = 'bw' | 'color';
export type PrintSides = 'duplex' | 'simplex';
export type PagesPerSheet = 1 | 2 | 4;
export type Orientation = 'auto' | 'portrait' | 'landscape';
export type BindingType = 'none' | 'spiral' | 'staple' | 'hole_punch_2' | 'hole_punch_4';
export type FrontCover = 'none' | 'clear_acetate' | 'frosted_pvc' | 'card_300gsm';
export type BackCover = 'none' | 'white_card_300gsm' | 'black_card_300gsm' | 'clear_acetate';

export const CopyShopPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistent document session token
  const [docSessionToken] = useState<string>(() => {
    const existing = sessionStorage.getItem('bs4_doc_session');
    if (existing) return existing;
    const token = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('bs4_doc_session', token);
    return token;
  });

  // Live DB pricing tiers
  const [dbTiers, setDbTiers] = useState<PriceTierItem[]>([]);

  // Uploaded files state
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<UploadedFileItem | null>(null);
  const [previewPageNum, setPreviewPageNum] = useState(1);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Configuration options state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [paperWeight, setPaperWeight] = useState<PaperWeight>('80gsm');
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [printSides, setPrintSides] = useState<PrintSides>('duplex');
  const [pagesPerSheet, setPagesPerSheet] = useState<PagesPerSheet>(1);
  const [orientation, setOrientation] = useState<Orientation>('auto');
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
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteServiceType, setQuoteServiceType] = useState<'standard_doc' | 'booklet' | 'poster_large' | 'cards_flyers'>('standard_doc');
  const [quoteCopies, setQuoteCopies] = useState<number>(1);
  const [quotePaperSize, setQuotePaperSize] = useState<'A4' | 'A5' | 'A3'>('A4');
  const [quotePaperWeight, setQuotePaperWeight] = useState<'80gsm' | '100gsm' | '300gsm'>('80gsm');
  const [quoteColorMode, setQuoteColorMode] = useState<ColorMode>('bw');
  const [quotePrintSides, setQuotePrintSides] = useState<PrintSides>('duplex');
  const [quotePagesPerSheet, setQuotePagesPerSheet] = useState<PagesPerSheet>(1);
  const [quoteBinding, setQuoteBinding] = useState<string>('none');
  const [quoteFrontCover, setQuoteFrontCover] = useState<FrontCover>('none');
  const [quoteBackCover, setQuoteBackCover] = useState<BackCover>('none');
  const [quoteDeadline, setQuoteDeadline] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSubmittedRef, setQuoteSubmittedRef] = useState<string | null>(null);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Fetch live DB tiers + pre-populate signed-in customer info + apply URL presets
  useEffect(() => {
    pricingApi
      .queryTiers({ isActive: true })
      .then((res) => setDbTiers(res || []))
      .catch(() => {
        // Fallback to default rates
      });

    try {
      const rawUser = localStorage.getItem('bs4_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setQuoteName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
        setQuoteEmail(user.email || '');
        setQuotePhone(user.phone || '');
      }
    } catch {
      // ignore
    }

    const preset = searchParams.get('preset');
    if (preset === 'dissertation') {
      setPaperSize('A4');
      setPaperWeight('100gsm');
      setColorMode('color');
      setPrintSides('duplex');
      setBindingType('spiral');
      setFrontCover('clear_acetate');
      setBackCover('black_card_300gsm');
    } else if (preset === 'manuals') {
      setPaperSize('A4');
      setPaperWeight('80gsm');
      setColorMode('bw');
      setPrintSides('duplex');
      setBindingType('hole_punch_4');
    } else if (preset === 'legal') {
      setPaperSize('A4');
      setPaperWeight('80gsm');
      setColorMode('bw');
      setPrintSides('simplex');
      setBindingType('staple');
    } else if (preset === 'a3_plans') {
      setPaperSize('A3');
      setPaperWeight('100gsm');
      setColorMode('color');
      setPrintSides('simplex');
      setBindingType('none');
    }
  }, [searchParams]);

  // Process & upload PDF files (client inspection + thumbnail + backend upload)
  const processFiles = async (fileList: FileList | File[]) => {
    setIsProcessingPdf(true);
    setUploadError(null);

    const incoming = Array.from(fileList);

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError(`"${file.name}" is not a PDF. Only PDF documents are accepted for printing.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`"${file.name}" exceeds the 100MB single-file limit.`);
        continue;
      }

      const localId = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const pageCount = pdf.numPages;
        const thumbnailUrl = await renderPdfPageToDataUrl(arrayBuffer, 1, 0.25).catch(() => '');

        const initialItem: UploadedFileItem = {
          id: localId,
          name: file.name,
          size: file.size,
          pageCount,
          thumbnailUrl,
          arrayBuffer,
          uploadStatus: 'uploading',
          uploadProgress: 10,
          fileObject: file,
        };

        setFiles((prev) => [...prev, initialItem]);

        // Upload real PDF to bs4-backend (/api/documents/upload)
        try {
          const uploadRes = await documentsApi.upload(file, docSessionToken, (pct) => {
            setFiles((prev) =>
              prev.map((item) => (item.id === localId ? { ...item, uploadProgress: pct } : item))
            );
          });

          setFiles((prev) =>
            prev.map((item) =>
              item.id === localId
                ? {
                  ...item,
                  serverFileId: uploadRes.file?.id,
                  secureUrl: uploadRes.file?.secureUrl,
                  uploadStatus: 'ready',
                  uploadProgress: 100,
                }
                : item
            )
          );
        } catch (serverErr: any) {
          console.warn('Backend document upload failed, keeping local file:', serverErr.message);
          setFiles((prev) =>
            prev.map((item) =>
              item.id === localId ? { ...item, uploadStatus: 'local', uploadProgress: 100 } : item
            )
          );
        }
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        setUploadError(`Could not read ${file.name}. Ensure it is a valid non-password-protected PDF.`);
      }
    }

    setIsProcessingPdf(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = async (item: UploadedFileItem) => {
    setFiles((prev) => prev.filter((f) => f.id !== item.id));
    if (item.serverFileId) {
      documentsApi.deleteDocument(item.serverFileId).catch(() => { });
    }
  };

  const moveFile = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= files.length) return;

    const updated = [...files];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setFiles(updated);

    const reorderPayload = updated
      .map((f, idx) => (f.serverFileId ? { id: f.serverFileId, sortOrder: idx } : null))
      .filter(Boolean) as Array<{ id: string; sortOrder: number }>;

    if (reorderPayload.length > 0) {
      documentsApi.reorder(reorderPayload).catch(() => { });
    }
  };

  const commitRename = (id: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      const normalizedName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: normalizedName } : f)));
    }
    setRenamingId(null);
  };

  const openPreview = async (file: UploadedFileItem, page = 1) => {
    setPreviewFile(file);
    setPreviewPageNum(page);
    setLoadingPreview(true);
    try {
      const buffer = file.arrayBuffer || (await file.fileObject.arrayBuffer());
      const url = await renderPdfPageToDataUrl(buffer, page, 1.15);
      setPreviewImageUrl(url);
    } catch {
      setPreviewImageUrl('');
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadDemoPdf = () => {
    const demoPdf = createSamplePdfFile('Sample_Lecture_Notes_2026.pdf', 12);
    processFiles([demoPdf]);
  };

  // -------------------------------------------------------------
  // LIVE 2026 TIERED CALCULATION (Syncs with DB tiers + fallback)
  // -------------------------------------------------------------
  const totalRawPages = files.reduce((acc, f) => acc + f.pageCount, 0);
  const effectivePages = Math.ceil(totalRawPages / pagesPerSheet);
  const physicalSheetsPerCopy = printSides === 'duplex' ? Math.ceil(effectivePages / 2) : effectivePages;
  const sidesPerCopy = printSides === 'duplex' ? effectivePages : physicalSheetsPerCopy;
  const totalPrintedSides = sidesPerCopy * copies;

  const lookupDbRate = (category: string, subCategory: string, qty: number): PriceTierItem | undefined => {
    return dbTiers.find(
      (t) =>
        t.category === category &&
        t.subCategory === subCategory &&
        qty >= t.minQty &&
        (t.maxQty === null || qty <= t.maxQty)
    );
  };

  let requiresQuote = false;
  let quoteReason = '';
  let sheetBaseRate = 0;

  if (paperWeight === '80gsm') {
    if (totalPrintedSides > 1000) {
      requiresQuote = true;
      quoteReason = 'Jobs over 1,000 printed sides qualify for our bulk custom quote.';
    } else {
      const subCat = `${paperSize === 'A3' ? 'A3' : 'A4'}_${colorMode === 'color' ? 'Color' : 'BW'}`;
      const dbTier = lookupDbRate('document_80gsm', subCat, Math.max(1, totalPrintedSides));
      if (dbTier && dbTier.unitPrice != null) {
        sheetBaseRate = Number(dbTier.unitPrice);
      } else if (totalPrintedSides <= 25) {
        sheetBaseRate = paperSize === 'A3' ? (colorMode === 'color' ? 1.20 : 0.60) : (colorMode === 'color' ? 0.50 : 0.25);
      } else if (totalPrintedSides <= 50) {
        sheetBaseRate = paperSize === 'A3' ? (colorMode === 'color' ? 0.90 : 0.45) : (colorMode === 'color' ? 0.45 : 0.20);
      } else if (totalPrintedSides <= 100) {
        sheetBaseRate = paperSize === 'A3' ? (colorMode === 'color' ? 0.80 : 0.30) : (colorMode === 'color' ? 0.40 : 0.18);
      } else if (totalPrintedSides <= 500) {
        sheetBaseRate = paperSize === 'A3' ? (colorMode === 'color' ? 0.70 : 0.26) : (colorMode === 'color' ? 0.35 : 0.15);
      } else {
        sheetBaseRate = paperSize === 'A3' ? (colorMode === 'color' ? 0.50 : 0.20) : (colorMode === 'color' ? 0.25 : 0.10);
      }
    }
  } else if (paperWeight === '100gsm') {
    if (totalPrintedSides > 250) {
      requiresQuote = true;
      quoteReason = 'Premium 120gsm document runs exceeding 250 printed sides qualify for bulk quote.';
    } else {
      const subCat = `${paperSize === 'A3' ? 'A3' : 'A4'}_Color`;
      const dbTier = lookupDbRate('document_120gsm', subCat, Math.max(1, totalPrintedSides));
      if (dbTier && dbTier.unitPrice != null) {
        sheetBaseRate = Number(dbTier.unitPrice);
      } else if (totalPrintedSides <= 10) {
        sheetBaseRate = paperSize === 'A3' ? 1.40 : 0.75;
      } else if (totalPrintedSides <= 50) {
        sheetBaseRate = paperSize === 'A3' ? 1.20 : 0.60;
      } else if (totalPrintedSides <= 100) {
        sheetBaseRate = paperSize === 'A3' ? 1.00 : 0.50;
      } else {
        sheetBaseRate = paperSize === 'A3' ? 0.85 : 0.45;
      }
      if (colorMode === 'bw') sheetBaseRate = sheetBaseRate * 0.5;
    }
  } else if (paperWeight === '300gsm') {
    const totalSheets = physicalSheetsPerCopy * copies;
    if (totalSheets > 250) {
      requiresQuote = true;
      quoteReason = 'Heavy 300gsm cardstock runs over 250 sheets qualify for custom quote.';
    } else {
      const subCat = `${paperSize === 'A3' ? 'A3' : 'A4'}_Color`;
      const dbTier = lookupDbRate('card_300gsm', subCat, Math.max(1, totalSheets));
      if (dbTier && dbTier.unitPrice != null) {
        sheetBaseRate = Number(dbTier.unitPrice);
      } else if (totalSheets <= 10) {
        sheetBaseRate = paperSize === 'A3' ? 2.00 : 1.20;
      } else if (totalSheets <= 25) {
        sheetBaseRate = paperSize === 'A3' ? 1.75 : 1.00;
      } else if (totalSheets <= 50) {
        sheetBaseRate = paperSize === 'A3' ? 1.50 : 0.90;
      } else if (totalSheets <= 100) {
        sheetBaseRate = paperSize === 'A3' ? 1.30 : 0.80;
      } else {
        sheetBaseRate = paperSize === 'A3' ? 1.10 : 0.70;
      }
      if (colorMode === 'bw') sheetBaseRate = sheetBaseRate * 0.7;
    }
  }

  const printCostPerCopy = Number((sidesPerCopy * sheetBaseRate).toFixed(2));

  // Binding fees per copy
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

  // Covers fees per copy
  const coverPrices: Record<string, number> = {
    none: 0,
    clear_acetate: 0.45,
    frosted_pvc: 0.55,
    card_300gsm: 0.65,
    white_card_300gsm: 0.45,
    black_card_300gsm: 0.50,
  };
  const coversCostPerCopy = (coverPrices[frontCover] || 0) + (coverPrices[backCover] || 0);

  const unitPriceGross = Number((printCostPerCopy + bindingCostPerCopy + coversCostPerCopy).toFixed(2));
  let rawSubtotal = Number((unitPriceGross * copies).toFixed(2));

  // Minimum Order Amount (£2.00 rule)
  let minimumOrderApplied = false;
  if (!requiresQuote && rawSubtotal > 0 && rawSubtotal < 2.00) {
    rawSubtotal = 2.00;
    minimumOrderApplied = true;
  }

  // Coupon discount
  const subtotalAfterCoupon = Math.max(0, Number((rawSubtotal - couponDiscount).toFixed(2)));

  // Shipping
  const freeShippingThreshold = 30.00;
  let shippingFee = shippingMethod === 'express' ? 6.99 : 3.50;
  const isFreeShipping = shippingMethod === 'standard' && subtotalAfterCoupon >= freeShippingThreshold;
  if (isFreeShipping) {
    shippingFee = 0;
  }

  const grandTotal = requiresQuote ? 0 : Number((subtotalAfterCoupon + shippingFee).toFixed(2));

  // Apply Coupon Code
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const data = await couponsApi.validate(couponCode, rawSubtotal);
      setCouponDiscount(Number(data.discountAmount));
      setAppliedCoupon(data.coupon ? data.coupon.code : couponCode);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setCouponDiscount(0);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const openQuoteModal = () => {
    setQuoteError(null);
    setQuoteSubmittedRef(null);
    setQuoteCopies(copies);
    setQuotePaperSize(paperSize);
    setQuotePaperWeight(paperWeight);
    setQuoteColorMode(colorMode);
    setQuotePrintSides(printSides);
    setQuotePagesPerSheet(pagesPerSheet);
    setQuoteBinding(bindingType);
    setQuoteFrontCover(frontCover);
    setQuoteBackCover(backCover);
    setQuoteServiceType('standard_doc');
    setShowQuoteModal(true);
  };

  // Bespoke Modal volume & strict threshold check across all categories
  const bespokePageCount = totalRawPages;
  const bespokeEffectivePages = Math.ceil(bespokePageCount / quotePagesPerSheet);
  const bespokePhysicalSheetsPerCopy =
    quotePrintSides === 'duplex' ? Math.ceil(bespokeEffectivePages / 2) : bespokeEffectivePages;
  const bespokeSidesPerCopy =
    quotePrintSides === 'duplex' ? bespokeEffectivePages : bespokePhysicalSheetsPerCopy;
  const bespokeTotalSides = bespokeSidesPerCopy * Math.max(1, quoteCopies);
  const bespokeTotalSheets = bespokePhysicalSheetsPerCopy * Math.max(1, quoteCopies);

  let bespokeThreshold = 1000;
  let bespokeCurrentVolume = bespokeTotalSides;
  let bespokeUnitLabel = 'printed sides';

  if (quoteServiceType === 'poster_large') {
    bespokeThreshold = 500;
    bespokeCurrentVolume = Math.max(1, quoteCopies);
    bespokeUnitLabel = 'posters';
  } else if (quoteServiceType === 'cards_flyers') {
    bespokeThreshold = 1000;
    bespokeCurrentVolume = Math.max(1, quoteCopies);
    bespokeUnitLabel = 'flyers/cards';
  } else if (quotePaperWeight === '300gsm') {
    bespokeThreshold = 250;
    bespokeCurrentVolume = bespokeTotalSheets;
    bespokeUnitLabel = 'sheets';
  } else if (quotePaperWeight === '100gsm') {
    bespokeThreshold = 250;
    bespokeCurrentVolume = bespokeTotalSides;
    bespokeUnitLabel = 'printed sides';
  }

  const bespokeExceedsOnlineLimit = bespokeCurrentVolume > bespokeThreshold;
  const bespokeHasValidFiles = files.length > 0 && !files.some((f) => f.uploadStatus === 'uploading');

  const applyQuoteSpecsToCopyShop = () => {
    setPaperSize(quotePaperSize);
    setPaperWeight(quotePaperWeight);
    setColorMode(quoteColorMode);
    setPrintSides(quotePrintSides);
    setPagesPerSheet(quotePagesPerSheet);
    if (quoteBinding !== 'custom_booklet') {
      setBindingType(quoteBinding as BindingType);
    }
    setFrontCover(quoteFrontCover);
    setBackCover(quoteBackCover);
    setCopies(Math.max(1, quoteCopies));
    setShowQuoteModal(false);
    setQuoteError(null);
  };

  // Submit Custom Quote Request
  const handleSubmitQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);

    if (files.length === 0) {
      setQuoteError('Please upload at least one PDF document before submitting a bespoke quote.');
      return;
    }
    if (files.some((f) => f.uploadStatus === 'uploading')) {
      setQuoteError('Please wait for your PDF document upload to complete.');
      return;
    }
    if (!bespokeExceedsOnlineLimit) {
      setQuoteError(
        `Your current run (${bespokeCurrentVolume} ${bespokeUnitLabel}) does not exceed the ${bespokeThreshold} ${bespokeUnitLabel} threshold. Please use Online Copy Shop & Document Printing instead.`
      );
      return;
    }
    if (!quoteName.trim() || !quoteEmail.trim() || !quoteDeadline.trim() || !quoteNotes.trim()) {
      setQuoteError('Please complete all required fields: Full Name, Email, Preferred Deadline, and Requirements.');
      return;
    }

    setIsSubmittingQuote(true);

    const payload = {
      customerName: quoteName.trim(),
      customerEmail: quoteEmail.trim(),
      customerPhone: quotePhone.trim() || undefined,
      serviceCategory: `${quoteServiceType}_${quotePaperWeight}`,
      quantity: Math.max(1, quoteCopies),
      specifications: {
        serviceType: quoteServiceType,
        paperSize: quotePaperSize,
        paperWeight: quotePaperWeight,
        colorMode: quoteColorMode,
        printSides: quotePrintSides,
        pagesPerSheet: quotePagesPerSheet,
        orientation,
        bindingType: quoteBinding,
        frontCover: quoteFrontCover,
        backCover: quoteBackCover,
        totalRawPages: bespokePageCount,
        physicalSheets: bespokePhysicalSheetsPerCopy,
        totalSheets: bespokeTotalSheets,
        totalPrintedSides: bespokeTotalSides,
        preferredDeadline: quoteDeadline.trim(),
      },
      fileUrls: files.map((f) => ({
        id: f.serverFileId || f.id,
        name: f.name,
        url: f.secureUrl || '',
        pageCount: f.pageCount,
      })),
      customerNotes: quoteNotes.trim(),
    };

    try {
      const data = await quotesApi.submitQuoteRequest(payload);
      setQuoteSubmittedRef(data.quoteNumber);
    } catch (err: any) {
      setQuoteError(err.response?.data?.message || err.message || 'Failed to submit quote request. Please try again.');
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
    if (files.some((f) => f.uploadStatus === 'uploading')) {
      setUploadError('Please wait for your PDF files to finish uploading.');
      return;
    }

    const jobData = {
      files: files.map((f) => ({
        id: f.serverFileId || f.id,
        serverFileId: f.serverFileId,
        name: f.name,
        pageCount: f.pageCount,
        size: f.size,
        secureUrl: f.secureUrl,
      })),
      config: {
        paperSize,
        paperWeight,
        colorMode,
        printSides,
        pagesPerSheet,
        orientation,
        bindingType,
        frontCover,
        backCover,
        copies,
        physicalSheets: physicalSheetsPerCopy,
        totalRawPages,
        totalPages: totalRawPages,
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

        {/* 2-Column Grid */}
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
                    <p className="text-xs text-slate-500">Auto page count, thumbnails, reordering & page preview</p>
                  </div>
                </div>

                {files.length === 0 && (
                  <button
                    onClick={loadDemoPdf}
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    + Load Sample PDF (12 Pgs)
                  </button>
                )}
              </div>

              {/* Drag & drop upload area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isProcessingPdf
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
                  Supports multiple PDF files up to 100MB each. Reorder, rename, and inspect every page before printing.
                </p>

                {isProcessingPdf && (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                    <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    Uploading & inspecting PDF pages...
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Print Queue ({files.length} {files.length === 1 ? 'File' : 'Files'}) • Total: {totalRawPages} Pages
                    </h4>
                    {files.length > 1 && (
                      <span className="text-[11px] text-slate-500">Printed sequentially from top to bottom</span>
                    )}
                  </div>

                  {files.map((file, idx) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Thumbnail */}
                        <button
                          type="button"
                          onClick={() => openPreview(file, 1)}
                          title="Preview PDF pages"
                          className="w-11 h-14 bg-slate-100 border border-slate-200 rounded overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                        >
                          {file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={`${file.name} preview`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-rose-600" />
                          )}
                        </button>

                        <div className="overflow-hidden flex-1">
                          {renamingId === file.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && commitRename(file.id)}
                                autoFocus
                                className="text-xs font-bold px-2 py-1 rounded border border-blue-400 focus:outline-hidden w-full max-w-xs"
                              />
                              <button
                                type="button"
                                onClick={() => commitRename(file.id)}
                                className="text-[11px] font-bold text-white bg-blue-600 px-2 py-1 rounded"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                          )}

                          <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 mt-1">
                            <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {file.pageCount} {file.pageCount === 1 ? 'Page' : 'Pages'}
                            </span>
                            <span>•</span>
                            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                            {file.uploadStatus === 'uploading' && (
                              <span className="text-blue-600 font-semibold">
                                • Uploading {file.uploadProgress}%
                              </span>
                            )}
                            {file.uploadStatus === 'ready' && (
                              <span className="text-emerald-600 font-semibold">• Synced to Print Server</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* File Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {files.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => moveFile(idx, -1)}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFile(idx, 1)}
                              disabled={idx === files.length - 1}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => openPreview(file, 1)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Preview PDF Pages"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(file.id);
                            setRenameDraft(file.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="Rename file"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                    { id: 'A4', label: 'A4 (Standard)', dims: '210 x 297 mm' },
                    { id: 'A5', label: 'A5 (Booklet)', dims: '148 x 210 mm' },
                    { id: 'A3', label: 'A3 (Large)', dims: '297 x 420 mm' },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setPaperSize(sz.id as PaperSize)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${paperSize === sz.id
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
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${paperWeight === wt.id
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

            {/* Step 3: Colour, Sides, Pages Per Sheet & Orientation */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Colour Mode & Page Layout</h2>
                  <p className="text-xs text-slate-500">Duplex printing & multi-up layout save paper</p>
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
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${colorMode === 'bw'
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
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${colorMode === 'color'
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
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${printSides === 'duplex'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <span className="text-sm block">Double-Sided</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Half physical sheets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintSides('simplex')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${printSides === 'simplex'
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pages per sheet */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Pages Per Sheet (Multi-Up)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: '1 Page' },
                      { val: 2, label: '2 Pages' },
                      { val: 4, label: '4 Pages' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPagesPerSheet(p.val as PagesPerSheet)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${pagesPerSheet === p.val
                            ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-xs block">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation & Auto Rotate */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    Page Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'auto', label: 'Auto Rotate' },
                      { id: 'portrait', label: 'Portrait' },
                      { id: 'landscape', label: 'Landscape' },
                    ].map((ori) => (
                      <button
                        key={ori.id}
                        type="button"
                        onClick={() => setOrientation(ori.id as Orientation)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${orientation === ori.id
                            ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold text-slate-900'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-xs block">{ori.label}</span>
                      </button>
                    ))}
                  </div>
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
                    { id: 'spiral', title: 'Metal Wire Spiral', price: physicalSheetsPerCopy > 100 ? '+£3.50' : '+£2.20' },
                    { id: 'staple', title: 'Stapled Corner', price: '+£0.30' },
                    { id: 'hole_punch_2', title: '2-Hole Punch', price: '+£0.20' },
                    { id: 'hole_punch_4', title: '4-Hole Punch', price: '+£0.30' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBindingType(b.id as BindingType)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${bindingType === b.id
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
                      className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
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
                      className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
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
                        className={`text-xs py-1.5 px-2.5 rounded-md border flex-1 font-semibold transition-all cursor-pointer ${copies === qty
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
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
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
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${shippingMethod === 'standard'
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
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${shippingMethod === 'express'
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
                  onClick={() => openQuoteModal()}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Request Bespoke / Bulk Quote</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={files.length === 0 || files.some((f) => f.uploadStatus === 'uploading')}
                  className={`w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all ${files.length === 0 || files.some((f) => f.uploadStatus === 'uploading')
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
                  onClick={() => openQuoteModal()}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Bulk order calculator (&gt;1,000 sides / &gt;250 cards)? Open bespoke quote form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF PAGE PREVIEW MODAL */}
        {previewFile && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{previewFile.name}</h3>
                  <p className="text-xs text-slate-500">
                    Page {previewPageNum} of {previewFile.pageCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 min-h-[380px] max-h-[65vh] overflow-auto flex items-center justify-center">
                {loadingPreview ? (
                  <div className="text-xs font-semibold text-blue-600">Rendering page preview...</div>
                ) : previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={`Page ${previewPageNum}`}
                    className={`max-h-[58vh] w-auto shadow-md bg-white border border-slate-200 ${colorMode === 'bw' ? 'grayscale' : ''
                      }`}
                  />
                ) : (
                  <div className="text-xs text-slate-500">Preview unavailable for this page.</div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={previewPageNum <= 1 || loadingPreview}
                  onClick={() => openPreview(previewFile, previewPageNum - 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Page
                </button>

                <span className="text-xs font-semibold text-slate-600">
                  {colorMode === 'bw' ? '⚫ Black & White Proof' : '🎨 Full Colour Proof'}
                </span>

                <button
                  type="button"
                  disabled={previewPageNum >= previewFile.pageCount || loadingPreview}
                  onClick={() => openPreview(previewFile, previewPageNum + 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Next Page <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM QUOTE REQUEST MODAL */}
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 shadow-2xl relative space-y-5 my-auto">
              <button
                type="button"
                onClick={() => {
                  setShowQuoteModal(false);
                  setQuoteSubmittedRef(null);
                  setQuoteError(null);
                }}
                className="sticky top-0 float-right p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {quoteSubmittedRef ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Bespoke Quote Request Submitted!</h3>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-blue-600">
                    REFERENCE: #{quoteSubmittedRef}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                    Thank you! Our Brislington print team has received your specifications and uploaded artwork. We will review your job, set an official price, email you confirmation, and make it available to pay directly in your{' '}
                    <span className="font-bold text-slate-800">My Account</span> dashboard.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuoteModal(false);
                      setQuoteSubmittedRef(null);
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuoteRequest} className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-3 pr-8">
                    <span className="text-blue-600 font-bold uppercase text-[10px] tracking-wider block">
                      Bespoke &amp; Bulk Commercial Print
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900">Request a Custom Bespoke Quote</h3>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Tell our Brislington print team exactly what you need and upload your print PDF(s). Standard retail orders up to{' '}
                      <strong>1,000 sides (80gsm)</strong> or <strong>250 sides/sheets (100gsm–300gsm)</strong> qualify for instant pricing in the{' '}
                      <strong>Online Copy Shop</strong>; larger runs or special stock/finishes use this Bespoke Quote form.
                    </p>
                  </div>

                  {/* Smart Volume / Threshold Guidance Banner */}
                  {bespokeExceedsOnlineLimit ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Qualifies for Bespoke Quote ({bespokeCurrentVolume} &gt; {bespokeThreshold} {bespokeUnitLabel})
                        </span>
                      </div>
                      <p className="text-amber-800 leading-snug">
                        Your print run exceeds the Online Copy Shop threshold of {bespokeThreshold} {bespokeUnitLabel}. Upload your PDF(s) and complete all required fields below so our Brislington print team can prepare a custom quote.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-blue-900">
                            Below Bespoke Threshold ({bespokeCurrentVolume} / {bespokeThreshold} {bespokeUnitLabel}) — Use Online Copy Shop
                          </div>
                          <p className="text-blue-800 text-[11px] mt-0.5 leading-snug">
                            Bespoke quotes require strictly over <strong>{bespokeThreshold} {bespokeUnitLabel}</strong>. Because your order is within the retail limit, please check out immediately via <strong>Online Copy Shop &amp; Document Printing</strong> (or increase quantity above {bespokeThreshold}).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={applyQuoteSpecsToCopyShop}
                          className="shrink-0 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Use Online Copy Shop
                        </button>
                      </div>
                    </div>
                  )}

                  {quoteError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  {/* 1. Document Upload inside Bespoke Modal (Required) */}
                  <div className={`p-3.5 rounded-xl border space-y-2.5 ${files.length === 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          1. Upload Print Document(s) <span className="text-rose-600">* Required</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Attach at least one PDF file so our team can verify pages, layout &amp; print artwork
                        </span>
                      </div>
                      <div>
                        <input
                          ref={modalFileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => e.target.files && processFiles(e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          disabled={isProcessingPdf}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 text-slate-800 font-bold text-xs cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                          {isProcessingPdf ? 'Uploading...' : files.length > 0 ? '+ Add PDF' : 'Upload PDF *'}
                        </button>
                      </div>
                    </div>

                    {files.length > 0 ? (
                      <div className="space-y-1.5">
                        {files.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-semibold text-slate-900 truncate">{f.name}</span>
                              <span className="text-[11px] text-slate-500 shrink-0">
                                ({f.pageCount} pages)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(f)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-white border border-dashed border-rose-300 text-[11px] text-rose-700 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Upload at least 1 PDF document above to calculate volume and unlock bespoke quote submission.</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Job Specifications */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">2. Print Specifications</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Total: {bespokePageCount} pages/copy • {bespokeTotalSides} printed sides • {bespokeTotalSheets} sheets
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                        <select
                          value={quoteServiceType}
                          onChange={(e) => setQuoteServiceType(e.target.value as any)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="standard_doc">Document Printing (&gt;1,000 80gsm / &gt;250 120gsm/300gsm)</option>
                          <option value="booklet">Booklets &amp; Manuals</option>
                          <option value="cards_flyers">Flyers / Leaflets (&gt;1,000)</option>
                          <option value="poster_large">A3 / Large Posters (&gt;500)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Quantity (Copies) *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={quoteCopies}
                          onChange={(e) => setQuoteCopies(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Paper Size</label>
                        <select
                          value={quotePaperSize}
                          onChange={(e) => setQuotePaperSize(e.target.value as any)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="A4">A4 (210 × 297 mm)</option>
                          <option value="A3">A3 (297 × 420 mm)</option>
                          <option value="A5">A5 (148 × 210 mm)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Paper Weight / Stock</label>
                        <select
                          value={quotePaperWeight}
                          onChange={(e) => setQuotePaperWeight(e.target.value as any)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="80gsm">80gsm Standard (&gt;1,000 sides)</option>
                          <option value="100gsm">120gsm Uncoated (&gt;250 sides)</option>
                          <option value="300gsm">300gsm Silk Card (&gt;250 sheets)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Colour Mode</label>
                        <select
                          value={quoteColorMode}
                          onChange={(e) => setQuoteColorMode(e.target.value as ColorMode)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="bw">Black &amp; White</option>
                          <option value="color">Full Colour (CMYK)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Print Sides</label>
                        <select
                          value={quotePrintSides}
                          onChange={(e) => setQuotePrintSides(e.target.value as PrintSides)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="duplex">Double-Sided</option>
                          <option value="simplex">Single-Sided</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Pages / Sheet</label>
                        <select
                          value={quotePagesPerSheet}
                          onChange={(e) => setQuotePagesPerSheet(Number(e.target.value) as PagesPerSheet)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value={1}>1 page per sheet</option>
                          <option value={2}>2 pages per sheet</option>
                          <option value={4}>4 pages per sheet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Binding / Finishing</label>
                        <select
                          value={quoteBinding}
                          onChange={(e) => setQuoteBinding(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="none">No Binding (Loose)</option>
                          <option value="spiral">Wire / Spiral Binding</option>
                          <option value="staple">Corner Stapling</option>
                          <option value="hole_punch_2">2-Hole Punch</option>
                          <option value="hole_punch_4">4-Hole Punch</option>
                          <option value="custom_booklet">Saddle-Stitch / Bespoke</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Preferred Deadline *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Friday 2pm / Standard"
                          value={quoteDeadline}
                          onChange={(e) => setQuoteDeadline(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Contact Info & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <label className="block font-bold text-slate-700 mb-1">Phone (Optional)</label>
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
                    <label className="block font-bold text-slate-700 mb-1">
                      Additional Requirements / Finishing Notes *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Specify foil/lamination, cover weights, split UK shipping addresses, or studio collection notes..."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingQuote || isProcessingPdf || !bespokeHasValidFiles || !bespokeExceedsOnlineLimit}
                    className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSubmittingQuote || isProcessingPdf || !bespokeHasValidFiles || !bespokeExceedsOnlineLimit
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer'
                      }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmittingQuote
                        ? 'Submitting Bespoke Quote...'
                        : !bespokeHasValidFiles
                          ? 'Upload a PDF Document First'
                          : !bespokeExceedsOnlineLimit
                            ? `Requires Over ${bespokeThreshold} ${bespokeUnitLabel} (Use Online Copy Shop)`
                            : 'Submit Bespoke Quote Request'}
                    </span>
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
