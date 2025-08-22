import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

// THIRD-PARTY LIBRARIES - Add these to your package.json:
// npm install html2canvas jspdf
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import constants and utilities
import { DEFAULT_BANK_DETAILS } from '../../utils/constants';

const GSTInvoiceViewer = ({ 
  open, 
  onClose, 
  saleData, 
  onPrint,
  // NEW: Additional props for invoice generator (optional)
  customerData,
  invoiceData,
  brickQuantity,
  pricePerBrick,
  isGSTInvoice
}) => {

  // NEW: State for PDF generation loading
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Handle both existing usage (saleData) and new usage (direct props)
  let actualSaleData = saleData;
  
  // If called from invoice generator, create saleData-like object
  if (!saleData && customerData && brickQuantity !== undefined) {
    // Use actual state information from customerData instead of hardcoding
    const actualState = customerData.actualState || customerData.customer_state || 'GUJARAT';
    const actualStateCode = customerData.actualStateCode || customerData.customer_state_code || '24';
    
    // FIXED: Proper invoice number logic for both GST and Non-GST invoices
    let invoiceNumber = '';
    if (isGSTInvoice) {
      // For GST invoices, use saved GST invoice number or fall back to actualInvoiceNumber
      invoiceNumber = invoiceData?.gstInvoiceNumber || invoiceData?.actualInvoiceNumber || `GST-${Date.now().toString().slice(-6)}`;
    } else {
      // For Non-GST invoices, no invoice number should be displayed
      invoiceNumber = '';
    }
    
    actualSaleData = {
      customer_name: customerData.name,
      customer_phone: customerData.phone,
      customer_email: customerData.email,
      customer_address: customerData.address || customerData.phone, // Use phone as address fallback
      customer_state: actualState, // Use actual state instead of hardcoding
      customer_state_code: actualStateCode, // Use actual state code instead of hardcoding
      customer_gstin: customerData.gstin || '',
      quantity: brickQuantity,
      price_per_brick: pricePerBrick || 2.5,
      discount_amount: 0,
      // FIXED: Use custom date from invoiceData if provided, otherwise use today's date
      date: invoiceData?.invoiceDate || new Date().toISOString().split('T')[0],
      invoice_number: invoiceNumber, // Use the corrected invoice number logic
      includeGST: isGSTInvoice || false,
      include_gst: isGSTInvoice || false,
      gst_included: isGSTInvoice || false
    };
  }

  if (!actualSaleData) return null;

  // Check if GST was included during sale recording
  const isGSTIncluded = actualSaleData.includeGST || actualSaleData.include_gst || actualSaleData.gst_included || false;

  // Calculate amounts based on whether GST was included
  const subtotal = actualSaleData.quantity * actualSaleData.price_per_brick;
  const discountAmount = actualSaleData.discount_amount || 0;
  const taxableAmount = subtotal - discountAmount;
  
  // Fix state comparison - handle both 'GJ' and 'GUJARAT' formats
  const customerState = actualSaleData.customer_state || '';
  const isInterState = customerState !== "GJ" && customerState !== "GUJARAT" && customerState !== "Gujarat";
  
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
  
  if (isGSTIncluded) {
    // Use stored GST amounts if available, otherwise calculate
    if (actualSaleData.cgst_amount !== undefined || actualSaleData.sgst_amount !== undefined || actualSaleData.igst_amount !== undefined) {
      cgstAmount = actualSaleData.cgst_amount || 0;
      sgstAmount = actualSaleData.sgst_amount || 0;
      igstAmount = actualSaleData.igst_amount || 0;
    } else {
      // Calculate GST amounts
      if (isInterState) {
        igstAmount = (taxableAmount * 12) / 100; // 12% IGST for inter-state
      } else {
        cgstAmount = (taxableAmount * 6) / 100; // 6% CGST for intra-state
        sgstAmount = (taxableAmount * 6) / 100; // 6% SGST for intra-state
      }
    }
  }
  // If GST not included, all GST amounts remain 0
  
  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const totalAmount = taxableAmount + totalTax;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Convert number to words (comprehensive Indian format)
  const numberToWords = (num) => {
    if (num === 0) return "Zero";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    // Helper function to convert numbers up to 999 to words
    const convertHundreds = (n) => {
      let result = "";

      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }

      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        if (n % 10 > 0) {
          result += " " + ones[n % 10];
        }
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }

      return result.trim();
    };

    // Helper function to convert numbers up to 99 to words
    const convertTens = (n) => {
      if (n >= 20) {
        let result = tens[Math.floor(n / 10)];
        if (n % 10 > 0) {
          result += " " + ones[n % 10];
        }
        return result;
      } else if (n >= 10) {
        return teens[n - 10];
      } else if (n > 0) {
        return ones[n];
      }
      return "";
    };

    let words = "";
    let remaining = rupees;

    // Crores (10,000,000)
    if (remaining >= 10000000) {
      const crores = Math.floor(remaining / 10000000);
      words += convertTens(crores) + " Crore ";
      remaining %= 10000000;
    }

    // Lakhs (100,000)
    if (remaining >= 100000) {
      const lakhs = Math.floor(remaining / 100000);
      words += convertTens(lakhs) + " Lakh ";
      remaining %= 100000;
    }

    // Thousands (1,000)
    if (remaining >= 1000) {
      const thousands = Math.floor(remaining / 1000);
      words += convertTens(thousands) + " Thousand ";
      remaining %= 1000;
    }

    // Hundreds, tens, and ones
    if (remaining > 0) {
      words += convertHundreds(remaining);
    }

    let result = "Rupees " + words.trim();

    if (paise > 0) {
      result += " and " + convertTens(paise) + " Paise";
    }

    result += " Only";

    return result;
  };

  const bankDetails = DEFAULT_BANK_DETAILS || {
    bankName: "KOTAK MAHINDRA BANK",
    accountNumber: "3647213697",
    ifscCode: "KKBK0000160",
    branch: "Viramgam Branch"
  };

  const INVOICE_TERMS = [
    "Goods once sold can not be taken back or exchange",
    "Payment will be made after one month of delivery", 
    "All Taxes and Commission will be charged extra."
  ];

  // NEW: Device detection function
  const detectDevice = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return {
      isIOS: /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream,
      isIPad: /iPad/.test(userAgent) && !window.MSStream,
      isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent)
    };
  };

  // NEW: PDF generation function for iOS devices only
  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      const element = document.getElementById('invoice-print-content');
      if (!element) {
        throw new Error('Invoice content not found');
      }

      // High-quality canvas options for better PDF output
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution for iPad Pro
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        letterRendering: true,
        removeContainer: true,
      });

      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Calculate dimensions to fit A4 page
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Add the image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = `Invoice_${actualSaleData.customer_name}_${actualSaleData.invoice_number || 'NoNumber'}_${formatDate(actualSaleData.date).replace(/\//g, '-')}.pdf`;

      // Download the PDF
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again or contact support.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // MODIFIED: Enhanced print function - PDF for iOS, window.print for desktop
  const handlePrint = () => {
    const device = detectDevice();
    
    if (device.isIOS || device.isIPad || device.isMobile) {
      // For iOS devices, generate PDF
      generatePDF();
    } else {
      // For desktop and other devices, use standard window.print
      window.print();
    }
  };

  return (
    <>
      {/* Global print styles - Hide modal background and preserve invoice design */}
      <style jsx global>{`
        @media print {
          /* Preserve enhanced invoice design */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Hide modal background and other UI elements */
          .MuiDialog-root .MuiBackdrop-root,
          .MuiDialog-paper,
          .MuiDialogContent-root,
          .MuiDialogActions-root {
            background: transparent !important;
            box-shadow: none !important;
          }
          
          /* Hide everything except the invoice content */
          body > *:not(.MuiDialog-root) {
            display: none !important;
          }
          
          /* Make dialog fullscreen for print */
          .MuiDialog-root {
            position: static !important;
          }
          
          .MuiDialog-container {
            position: static !important;
            transform: none !important;
          }
          
          .MuiDialog-paper {
            position: static !important;
            margin: 0 !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          
          /* Preserve gradients and backgrounds for invoice content */
          #invoice-print-content,
          #invoice-print-content * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Ensure backgrounds and borders print correctly */
          .MuiBox-root,
          .MuiTableCell-root,
          .MuiTableRow-root {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      sx={{ zIndex: 1400 }} // Added for proper layering with invoice generator
      PaperProps={{
        sx: { 
          maxHeight: '90vh',
          '& .MuiDialogContent-root': {
            padding: 0,
          }
        }
      }}
    >
      <DialogContent>
        <Box 
          id="invoice-print-content" // Added ID for print targeting
          sx={{ 
            p: 1.5, 
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontSize: '12px',
            lineHeight: 1.2,
            backgroundColor: 'white',
            minHeight: '800px',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderRadius: '8px',
            overflow: 'hidden',
            '@media print': {
              p: 1,
              boxShadow: 'none',
              borderRadius: 0,
              minHeight: 'auto',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              colorAdjust: 'exact',
              '& *': {
                WebkitPrintColorAdjust: 'exact !important',
                printColorAdjust: 'exact !important',
                colorAdjust: 'exact !important'
              }
            }
          }}
        >
          {/* Decorative Header Strip */}
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            height: '6px',
            // background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            colorAdjust: 'exact'
          }} />

          {/* Logo at very left corner */}
          <Box sx={{ position: 'absolute', top: 55, left: 16, zIndex: 1 }}>
            <img 
              src="/assets/patel-bricks-logo.png"
              alt="Patel Bricks Logo"
              style={{
                width: '80px',
                height: '70px',
                objectFit: 'contain',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Box>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold', 
              fontSize: '16px',
              color: '#1976d2',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              {isGSTIncluded ? 'TAX INVOICE' : 'INVOICE'}
            </Typography>
          </Box>

          {/* Company Header - Enhanced Design */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: 1.5, 
            border: '2px solid #1976d2', 
            borderRadius: '8px',
            p: 1.5,
            background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
            boxShadow: '0 2px 10px rgba(25, 118, 210, 0.1)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            colorAdjust: 'exact',
            '@media print': {
              borderRadius: '4px',
              p: 1,
              mb: 1,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              colorAdjust: 'exact'
            }
          }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              fontSize: '24px', 
              mb: 0.5,
              color: '#1976d2',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '1px',
              '@media print': {
                fontSize: '20px',
                mb: 0.3
              }
            }}>
              PATEL BRICKS
            </Typography>
            <Typography variant="body2" sx={{ 
              fontWeight: '600', 
              fontSize: '13px', 
              mb: 0.5,
              color: '#424242',
              letterSpacing: '0.3px',
              '@media print': {
                fontSize: '11px',
                mb: 0.3
              }
            }}>
              MANUFACTURER OF FLY ASH BRICKS
            </Typography>
            <Typography variant="body2" sx={{ 
              fontSize: '11px',
              color: '#666666',
              lineHeight: 1.3,
              '@media print': {
                fontSize: '10px'
              }
            }}>
              BEHIND PATEL PETROLEUM,MANDAL ROAD,@BHOJVA,VIRAMGAM-382150
            </Typography>
            <Typography variant="body2" sx={{ 
              fontSize: '11px',
              color: '#666666',
              letterSpacing: '0.2px',
              '@media print': {
                fontSize: '10px'
              }
            }}>
              Mo:9898032192,8000001819 E-mail: patelbricks1819@gmail.com
            </Typography>
          </Box>

          {/* Invoice Details Row - Enhanced */}
          <Box sx={{ 
            display: 'flex', 
            border: '2px solid #e0e0e0', 
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            mb: 0.5,
            '@media print': {
              borderRadius: '3px',
              mb: 0.3
            }
          }}>
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              borderRight: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong style={{ color: '#1976d2' }}>PATEL BRICKS GST NO:</strong> 24BLLPP8863R1ZX
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong style={{ color: '#1976d2' }}>Tax is Payable On Reverse Charge:</strong> NO
              </Typography>
              {isGSTInvoice && actualSaleData.invoice_number && (
                <Typography variant="body2" sx={{ fontSize: '11px', color: '#333' }}>
                  <strong style={{ color: '#1976d2' }}>Invoice Number:</strong> {actualSaleData.invoice_number}
                </Typography>
              )}
            </Box>
            <Box sx={{ 
              flex: 1, 
              p: 1,
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong style={{ color: '#1976d2' }}>Transportation Mode:</strong> BY ROAD
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong style={{ color: '#1976d2' }}>Invoice Date:</strong> {formatDate(actualSaleData.date)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: '#333' }}>
                <strong style={{ color: '#1976d2' }}>State Code:</strong> 24
              </Typography>
            </Box>
          </Box>

          {/* Customer Details - Enhanced */}
          <Box sx={{ 
            display: 'flex', 
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            mb: 1,
            '@media print': {
              borderRadius: '3px',
              mb: 0.5
            }
          }}>
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              borderRight: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                mb: 0.8,
                color: '#1976d2',
                borderBottom: '1px solid #e3f2fd',
                paddingBottom: '2px',
                '@media print': {
                  fontSize: '11px',
                  mb: 0.5
                }
              }}>
                Details of Receiver
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>Name:</strong> {actualSaleData.customer_name}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>Address:</strong> {actualSaleData.customer_address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>State:</strong> {actualSaleData.customer_state}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>State Code:</strong> {actualSaleData.customer_state_code || '24'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: '#333' }}>
                <strong>GSTIN Number:</strong> {actualSaleData.customer_gstin || '-'}
              </Typography>
            </Box>
            <Box sx={{ 
              flex: 1, 
              p: 1,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                mb: 0.8,
                color: '#1976d2',
                borderBottom: '1px solid #e3f2fd',
                paddingBottom: '2px',
                '@media print': {
                  fontSize: '11px',
                  mb: 0.5
                }
              }}>
                Billed To
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>Name:</strong> {actualSaleData.customer_name}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>Address:</strong> {actualSaleData.customer_address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>State:</strong> {actualSaleData.customer_state}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                <strong>State Code:</strong> {actualSaleData.customer_state_code || '24'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: '#333' }}>
                <strong>GSTIN Number:</strong> {actualSaleData.customer_gstin || '-'}
              </Typography>
            </Box>
          </Box>

          {/* Items Table - Enhanced */}
          <TableContainer sx={{ 
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            mb: 1,
            '@media print': {
              borderRadius: '3px',
              mb: 0.5
            }
          }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ 
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  colorAdjust: 'exact'
                }}>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '6%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    Sr. No
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '20%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    Description of Goods
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '8%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    HSN Code (GST)
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '8%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    Quantity
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '8%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    Rate
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '12%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    Taxable Value IN Rs.
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '12%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    SGST 6 %
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '12%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    CGST 6 %
                  </TableCell>
                  <TableCell sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    p: 0.5, 
                    textAlign: 'center', 
                    width: '14%',
                    color: 'white',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                  }}>
                    IGST
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)' }}>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    1
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, fontWeight: '500' }}>
                    FLY ASH BRICKS
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    6815
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: '500' }}>
                    {actualSaleData.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {actualSaleData.price_per_brick.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: '500' }}>
                    {taxableAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {sgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {cgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {igstAmount > 0 ? igstAmount.toFixed(2) : "-"}
                  </TableCell>
                </TableRow>
                {/* Empty rows for spacing */}
                {[...Array(3)].map((_, index) => (
                  <TableRow key={index} sx={{ height: '20px', background: index % 2 === 0 ? '#fafafa' : 'white' }}>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid #e0e0e0', p: 0.3 }}>&nbsp;</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow sx={{ 
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  colorAdjust: 'exact'
                }}>
                  <TableCell colSpan={3} sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, fontWeight: 'bold' }}>
                    TOTAL
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
                    {actualSaleData.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5 }}>
                    &nbsp;
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
                    {taxableAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
                    {sgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
                    {cgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '11px', p: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
                    {igstAmount > 0 ? igstAmount.toFixed(2) : "0"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals Section - Enhanced */}
          <Box sx={{ 
            display: 'flex', 
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            mb: 1,
            '@media print': {
              borderRadius: '3px',
              mb: 0.5
            }
          }}>
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              borderRight: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                mb: 0.8,
                color: '#1976d2',
                borderBottom: '1px solid #e3f2fd',
                paddingBottom: '2px',
                '@media print': {
                  fontSize: '11px',
                  mb: 0.5
                }
              }}>
                Invoice Value in Words
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', fontStyle: 'italic', color: '#333' }}>
                {numberToWords(totalAmount)}
              </Typography>
            </Box>
            <Box sx={{ 
              flex: 1, 
              p: 1,
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                  <strong>Total Amount Before Tax:</strong> ₹{taxableAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                  <strong>Add SGST:</strong> ₹{sgstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                  <strong>Add CGST:</strong> ₹{cgstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px', mb: 0.3, color: '#333' }}>
                  <strong>Add IGST:</strong> ₹{igstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5, color: '#1976d2' }}>
                  <strong>Total Tax Amount:</strong> ₹{totalTax.toFixed(2)}
                </Typography>
                <Box sx={{ 
                  mt: 0.5, 
                  pt: 0.5, 
                  borderTop: '2px solid #1976d2',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: '4px',
                  p: 0.5,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  colorAdjust: 'exact'
                }}>
                  <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 'bold', color: '#1976d2' }}>
                    <strong>Invoice Total: ₹{totalAmount.toFixed(2)}</strong>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Bottom Section - Enhanced */}
          <Box sx={{ 
            display: 'flex', 
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            minHeight: '100px',
            '@media print': {
              borderRadius: '3px',
              minHeight: '80px'
            }
          }}>
            {/* Bank Details */}
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              borderRight: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '11px', 
                mb: 0.5,
                color: '#1976d2'
              }}>
                Amount of Tax Subject To Reverse Charge
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '10px', mb: 1, color: '#333' }}>
                NO
              </Typography>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '11px', 
                mb: 0.5,
                color: '#1976d2',
                borderBottom: '1px solid #e3f2fd',
                paddingBottom: '2px'
              }}>
                Bank Details
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '10px', mb: 0.2, color: '#333' }}>
                <strong>Bank:</strong> {bankDetails.bankName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '10px', mb: 0.2, color: '#333' }}>
                <strong>A/C No:</strong> {bankDetails.accountNumber}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '10px', mb: 0.2, color: '#333' }}>
                <strong>IFSC:</strong> {bankDetails.ifscCode}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '10px', color: '#333' }}>
                <strong>Branch:</strong> {bankDetails.branch}
              </Typography>
            </Box>

            {/* Terms & Conditions */}
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              borderRight: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '11px', 
                mb: 0.8,
                color: '#1976d2',
                borderBottom: '1px solid #e3f2fd',
                paddingBottom: '2px',
                '@media print': {
                  mb: 0.5
                }
              }}>
                Terms & Conditions For Sale
              </Typography>
              {INVOICE_TERMS.map((term, index) => (
                <Typography key={index} variant="body2" sx={{ 
                  fontSize: '10px', 
                  mb: 0.4,
                  color: '#333',
                  lineHeight: 1.2
                }}>
                  {index + 1}. {term}
                </Typography>
              ))}
            </Box>

            {/* Company Seal & Signature */}
            <Box sx={{ 
              flex: 1, 
              p: 1, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
              '@media print': {
                p: 0.8
              }
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '11px', 
                mb: 0.5,
                color: '#1976d2'
              }}>
                Company Seal
              </Typography>
              <Box sx={{ height: 15, mb: 0.5 }}>
                {/* Space for company seal */}
              </Box>
              
              {/* Signature Image */}
              <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                <img 
                  src="/assets/signature.png"
                  alt="Authorized Signature"
                  style={{
                    maxWidth: '100px',
                    maxHeight: '60px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.1))'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </Box>
              
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                fontSize: '11px', 
                mb: 0.5,
                color: '#1976d2'
              }}>
                FOR,PATEL BRICKS
              </Typography>
              <Box sx={{ 
                mt: 1, 
                pt: 0.5, 
                borderTop: '1px solid #1976d2',
                borderRadius: '2px'
              }}>
                <Typography variant="body2" sx={{ fontSize: '10px', color: '#333' }}>
                  Authorised Signatory
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Footer Watermark */}
          <Box sx={{ 
            textAlign: 'center', 
            mt: 1, 
            opacity: 0.5,
            fontSize: '9px',
            color: '#999',
            '@media print': {
              mt: 0.5,
              fontSize: '8px'
            }
          }}>
            Generated by Patel Bricks Invoice System
          </Box>
        </Box>
      </DialogContent>
      
      {/* Dialog Actions with Enhanced Buttons */}
      <DialogActions 
        sx={{ 
          p: 3, 
          borderTop: '1px solid #e0e0e0',
          background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
          '@media print': {
            display: 'none !important'
          }
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            startIcon={<CloseIcon />}
            disabled={isGeneratingPDF}
            sx={{
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                borderColor: '#1565c0',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            variant="contained"
            startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={isGeneratingPDF}
            sx={{ 
              backgroundColor: '#1976d2',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
              }
            }}
          >
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default GSTInvoiceViewer;