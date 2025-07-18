import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

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
  // Handle both existing usage (saleData) and new usage (direct props)
  let actualSaleData = saleData;
  
  // If called from invoice generator, create saleData-like object
  if (!saleData && customerData && brickQuantity !== undefined) {
    // Use actual state information from customerData instead of hardcoding
    const actualState = customerData.actualState || customerData.customer_state || 'GUJARAT';
    const actualStateCode = customerData.actualStateCode || customerData.customer_state_code || '24';
    
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
      date: new Date().toISOString().split('T')[0],
      invoice_number: invoiceData?.actualInvoiceNumber || `${isGSTInvoice ? 'GST' : 'NGST'}-${Date.now().toString().slice(-6)}`,
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

  return (
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
          sx={{ 
            p: 2, 
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            lineHeight: 1.2,
            border: '2px solid black',
            backgroundColor: 'white',
            minHeight: '800px'
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14px' }}>
              {isGSTIncluded ? 'TAX INVOICE' : 'INVOICE'}
            </Typography>
          </Box>

          {/* Company Header */}
          <Box sx={{ textAlign: 'center', mb: 2, border: '1px solid black', p: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '24px', mb: 1 }}>
              PATEL BRICKS
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px', mb: 1 }}>
              MANUFACTURER OF FLY ASH BRICKS
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px' }}>
              BEHIND PATEL PETROLEUM,MANDAL ROAD,@BHOJVA,VIRAMGAM-382150
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px' }}>
              Mo:98980321392,8000001819 E-mail: patelbricks1819@gmail.com
            </Typography>
          </Box>

          {/* Invoice Details Row */}
          <Box sx={{ display: 'flex', border: '1px solid black', borderTop: '1px solid black' }}>
            <Box sx={{ flex: 1, p: 1, borderRight: '1px solid black' }}>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>PATEL BRICKS GST NO:</strong> 24BLLPP8863R1ZX
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Tax is Payable On Reverse Charge:</strong> NO
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Invoice Number:</strong> {actualSaleData.invoice_number || 'B18'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Transportation Mode:</strong> BY ROAD
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Invoice Date:</strong> {formatDate(actualSaleData.date)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>State Code:</strong> 24
              </Typography>
            </Box>
          </Box>

          {/* Customer Details */}
          <Box sx={{ display: 'flex', border: '1px solid black', borderTop: 'none' }}>
            <Box sx={{ flex: 1, p: 1, borderRight: '1px solid black' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                Details of Receiver
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Name:</strong> {actualSaleData.customer_name}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Address:</strong> {actualSaleData.customer_address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>State:</strong> {actualSaleData.customer_state}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>State Code:</strong> {actualSaleData.customer_state_code || '24'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>GSTIN Number:</strong> {actualSaleData.customer_gstin || '-'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                Billed To
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Name:</strong> {actualSaleData.customer_name}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>Address:</strong> {actualSaleData.customer_address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>State:</strong> {actualSaleData.customer_state}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>State Code:</strong> {actualSaleData.customer_state_code || '24'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>GSTIN Number:</strong> {actualSaleData.customer_gstin || '-'}
              </Typography>
            </Box>
          </Box>

          {/* Items Table */}
          <TableContainer sx={{ border: '1px solid black', borderTop: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '6%' }}>
                    Sr. No
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '20%' }}>
                    Description of Goods
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '8%' }}>
                    HSN Code (GST)
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '8%' }}>
                    Quantity
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '8%', borderRight: '2px solid black' }}>
                    Rate
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '12%' }}>
                    Taxable Value IN Rs.
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '12%' }}>
                    SGST 6 %
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '12%' }}>
                    CGST 6 %
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', fontSize: '11px', p: 0.5, textAlign: 'center', width: '14%' }}>
                    IGST
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    1
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5 }}>
                    FLY ASH BRICKS
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    6815
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {actualSaleData.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center', borderRight: '2px solid black' }}>
                    {actualSaleData.price_per_brick.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {taxableAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {sgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {cgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {igstAmount > 0 ? igstAmount.toFixed(2) : "-"}
                  </TableCell>
                </TableRow>
                {/* Empty rows for spacing - matching original design */}
                {[...Array(4)].map((_, index) => (
                  <TableRow key={index} sx={{ height: '30px' }}>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5, borderRight: '2px solid black' }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                    <TableCell sx={{ border: '1px solid black', p: 0.5 }}>&nbsp;</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow>
                  <TableCell colSpan={3} sx={{ border: '1px solid black', fontSize: '11px', p: 0.5 }}>
                    &nbsp;
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {actualSaleData.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, borderRight: '2px solid black' }}>
                    &nbsp;
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {taxableAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {sgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {cgstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid black', fontSize: '11px', p: 0.5, textAlign: 'center' }}>
                    {igstAmount > 0 ? igstAmount.toFixed(2) : "0"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals Section */}
          <Box sx={{ display: 'flex', border: '1px solid black', borderTop: 'none' }}>
            <Box sx={{ flex: 1, p: 1, borderRight: '1px solid black' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                Invoice Value in Words
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                {numberToWords(totalAmount)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>
                  <strong>Total Amount Before Tax:</strong> {taxableAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>
                  <strong>Add SGST:</strong> {sgstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>
                  <strong>Add CGST:</strong> {cgstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>
                  <strong>Add IGST:</strong> {igstAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                  <strong>Total Tax Amount:</strong> {totalTax.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 'bold', mt: 1, pt: 1, borderTop: '1px solid black' }}>
                  <strong>Invoice Total:</strong> {totalAmount.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Bottom Section - Bank Details, Terms, Signature */}
          <Box sx={{ display: 'flex', border: '1px solid black', borderTop: 'none', minHeight: '120px' }}>
            {/* Bank Details */}
            <Box sx={{ flex: 1, p: 1, borderRight: '1px solid black' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                Amount of Tax Subject To Reverse Charge
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', mb: 1 }}>
                NO
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1, mt: 2 }}>
                Bank Details
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                {bankDetails.bankName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                {bankDetails.accountNumber}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                {bankDetails.ifscCode}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                {bankDetails.branch}
              </Typography>
            </Box>

            {/* Terms & Conditions */}
            <Box sx={{ flex: 1, p: 1, borderRight: '1px solid black' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                Terms & Conditions For Sale
              </Typography>
              {INVOICE_TERMS.map((term, index) => (
                <Typography key={index} variant="body2" sx={{ fontSize: '10px', mb: 0.5 }}>
                  {index + 1}.{term}
                </Typography>
              ))}
            </Box>

            {/* Company Seal & Signature */}
            <Box sx={{ flex: 1, p: 1, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 2 }}>
                Company Seal
              </Typography>
              <Box sx={{ height: 40, mb: 2 }}>
                {/* Space for company seal */}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', mb: 1 }}>
                FOR,PATEL BRICKS
              </Typography>
              <Box sx={{ mt: 3, pt: 1, borderTop: '1px solid black' }}>
                <Typography variant="body2" sx={{ fontSize: '11px' }}>
                  Authorised Signatory
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GSTInvoiceViewer;