// components/sales/LedgerGenerator.js - Customer Ledger Generator Component with PDF Implementation
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  CalendarToday as CalendarIcon,
  Assessment as LedgerIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { formatCurrency, formatQuantity } from '../../utils/calculations';
import { DB_PATHS } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';

const LedgerGenerator = ({ open, onClose, customer, salesHistory }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [generatedInvoices, setGeneratedInvoices] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form management for date range - REMOVED EXCEL FORMAT
  const {
    control,
    handleSubmit,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      dateFrom: '',
      dateTo: new Date().toISOString().split('T')[0],
      format: 'pdf', // Only PDF now
    },
  });

  const watchedValues = watch();

  // Fetch payment history and generated invoices from Firebase
  const fetchPaymentHistory = async () => {
    if (!customer) return;

    try {
      setLoadingPayments(true);
      setLoadingInvoices(true);
      
      // Fetch all payments from Firebase
      const paymentsResult = await dbUtils.readData(`${DB_PATHS.SALES}/payments`);
      
      if (paymentsResult.success && paymentsResult.data) {
        // Filter payments for this customer
        const customerPayments = Object.entries(paymentsResult.data)
          .map(([id, payment]) => ({ ...payment, id }))
          .filter(payment => 
            payment.customerName === customer.name && 
            payment.customerPhone === customer.phone
          )
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setPaymentHistory(customerPayments);
      } else {
        setPaymentHistory([]);
      }
      setLoadingPayments(false);

      // NEW: Fetch generated invoices from Firebase
      const invoicesResult = await dbUtils.readData(`${DB_PATHS.SALES}/invoices`);
      
      if (invoicesResult.success && invoicesResult.data) {
        // Filter invoices for this customer
        const customerInvoices = Object.entries(invoicesResult.data)
          .map(([id, invoice]) => ({ ...invoice, id }))
          .filter(invoice => 
            invoice.customerName === customer.name && 
            invoice.customerPhone === customer.phone
          )
          // FIXED: Sort by custom invoice date instead of creation date
          .sort((a, b) => {
            const dateA = a.invoiceData?.invoiceDate || a.createdDate;
            const dateB = b.invoiceData?.invoiceDate || b.createdDate;
            return new Date(dateA) - new Date(dateB);
          });

        setGeneratedInvoices(customerInvoices);
      } else {
        setGeneratedInvoices([]);
      }
      setLoadingInvoices(false);

    } catch (error) {
      
      setPaymentHistory([]);
      setGeneratedInvoices([]);
      setLoadingPayments(false);
      setLoadingInvoices(false);
    }
  };

  // Load payment history when customer changes or dialog opens
  useEffect(() => {
    if (open && customer) {
      fetchPaymentHistory();
    }
  }, [open, customer]);

  // Process ledger data
  const ledgerData = useMemo(() => {
    if (!customer) return null;

    // UPDATED: Use generated invoices instead of sales history for purchase entries
    const customerInvoices = generatedInvoices;
    const customerPayments = paymentHistory;

    // Apply date filters to invoices
    let filteredInvoices = customerInvoices;
    let filteredPayments = customerPayments;

    if (watchedValues.dateFrom) {
      // FIXED: Use custom invoice date for filtering instead of creation date
      filteredInvoices = filteredInvoices.filter(invoice => {
        const invoiceDate = invoice.invoiceData?.invoiceDate || invoice.createdDate;
        return invoiceDate >= watchedValues.dateFrom;
      });
      filteredPayments = filteredPayments.filter(payment => payment.date >= watchedValues.dateFrom);
    }

    if (watchedValues.dateTo) {
      // FIXED: Use custom invoice date for filtering instead of creation date
      filteredInvoices = filteredInvoices.filter(invoice => {
        const invoiceDate = invoice.invoiceData?.invoiceDate || invoice.createdDate;
        return invoiceDate <= watchedValues.dateTo;
      });
      filteredPayments = filteredPayments.filter(payment => payment.date <= watchedValues.dateTo);
    }

    // Create ledger entries
    const ledgerEntries = [];

    // Add generated invoices as debit entries
    filteredInvoices.forEach(invoice => {
      const invoiceData = invoice.invoiceData;
      if (!invoiceData) return;

      // FIXED: Use custom invoice date instead of creation date
      const actualInvoiceDate = invoiceData.invoiceDate || invoice.createdDate;

      // Add GST invoice entry if exists
      if (invoice.gstBricks > 0) {
        ledgerEntries.push({
          date: actualInvoiceDate, // FIXED: Using custom invoice date
          particulars: `GST Invoice - ${formatQuantity(invoice.gstBricks)} bricks @ ${formatCurrency(invoiceData.actualRate)} each`,
          invoiceNumber: `${invoice.id}_GST`,
          debit: invoiceData.gstAmount || 0,
          credit: 0,
          type: 'gst_invoice',
          balance: 0,
        });
      }

      // Add Non-GST invoice entry if exists
      if (invoice.nonGstBricks > 0) {
        ledgerEntries.push({
          date: actualInvoiceDate, // FIXED: Using custom invoice date
          particulars: `Non-GST Invoice - ${formatQuantity(invoice.nonGstBricks)} bricks @ ${formatCurrency(invoiceData.actualRate)} each (without GST)`,
          invoiceNumber: `${invoice.id}_NonGST`,
          debit: invoiceData.nonGstAmount || 0,
          credit: 0,
          type: 'non_gst_invoice',
          balance: 0,
        });
      }
    });

    // Add payments as credit entries (unchanged)
    filteredPayments.forEach(payment => {
      ledgerEntries.push({
        date: payment.date,
        particulars: `Payment received via ${payment.modeOfPayment}${payment.notes ? ` - ${payment.notes}` : ''}`,
        invoiceNumber: payment.id,
        debit: 0,
        credit: parseFloat(payment.creditAmount || 0),
        type: 'payment',
        balance: 0,
      });
    });

    // Sort by date
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    ledgerEntries.forEach(entry => {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    });

    // Calculate totals
    const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const remainingBalance = totalDebit - totalCredit;

    return {
      entries: ledgerEntries,
      summary: {
        totalInvoices: totalDebit,
        totalCredits: totalCredit,
        remainingPayment: remainingBalance,
        totalTransactions: ledgerEntries.length,
        dateRange: {
          from: watchedValues.dateFrom || (ledgerEntries.length > 0 ? ledgerEntries[0].date : ''),
          to: watchedValues.dateTo || (ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].date : ''),
        },
      },
    };
  }, [customer, generatedInvoices, paymentHistory, watchedValues.dateFrom, watchedValues.dateTo]);

  // Update preview when data changes
  useEffect(() => {
    setPreviewData(ledgerData);
  }, [ledgerData]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        dateFrom: '',
        dateTo: new Date().toISOString().split('T')[0],
        format: 'pdf',
      });
    }
  }, [open, reset]);

  // Generate ledger
  const onSubmit = async (data) => {
    try {
      setIsGenerating(true);

      if (!ledgerData || ledgerData.entries.length === 0) {
        toast.error('No transactions found for the selected date range');
        return;
      }

      // Prepare ledger document data
      const documentData = {
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        dateRange: {
          from: data.dateFrom || 'Beginning',
          to: data.dateTo,
        },
        summary: ledgerData.summary,
        entries: ledgerData.entries,
        generatedOn: new Date().toISOString(),
        format: data.format,
      };

      await generatePDFLedger(documentData);
      toast.success('PDF ledger generated and opened successfully');

    } catch (error) {
      
      toast.error('Failed to generate ledger');
    } finally {
      setIsGenerating(false);
    }
  };

  // UPDATED: Actual PDF generation implementation
  const generatePDFLedger = async (data) => {
    // Create a new window for the printable ledger
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Could not open print window. Please check popup blockers.');
    }

    // Generate HTML content for the ledger
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 5px;
          }
          .ledger-title {
            font-size: 20px;
            margin: 10px 0;
            color: #333;
          }
          .customer-info {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .table th, .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #1976d2;
            color: white;
            font-weight: bold;
          }
          .table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .text-right {
            text-align: right;
          }
          .debit {
            color: #d32f2f;
            font-weight: bold;
          }
          .credit {
            color: #2e7d32;
            font-weight: bold;
          }
          .balance {
            font-weight: bold;
          }
          .summary {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
          }
          .print-button {
            background-color: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 20px 10px 10px 0;
          }
          .print-button:hover {
            background-color: #1565c0;
          }
          @page {
            margin: 0.5in;
            size: A4;
          }
          @media print {
            .print-button {
              display: none;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          .badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
          }
          .badge-gst {
            background-color: #ffebee;
            color: #c62828;
          }
          .badge-non-gst {
            background-color: #fff3e0;
            color: #ef6c00;
          }
          .badge-payment {
            background-color: #e8f5e8;
            color: #2e7d32;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">PATEL BRICKS</div>
          <div class="ledger-title">CUSTOMER LEDGER STATEMENT</div>
        </div>

        <div class="customer-info">
          <div class="info-row">
            <span class="label">Customer Name:</span>
            <span>${data.customer.name}</span>
          </div>
          <div class="info-row">
            <span class="label">Phone:</span>
            <span>${data.customer.phone}</span>
          </div>
          ${data.customer.email ? `
          <div class="info-row">
            <span class="label">Email:</span>
            <span>${data.customer.email}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Statement Period:</span>
            <span>${data.dateRange.from} to ${data.dateRange.to}</span>
          </div>
          <div class="info-row">
            <span class="label">Generated On:</span>
            <span>${new Date(data.generatedOn).toLocaleDateString()}</span>
          </div>
        </div>

        <button class="print-button" onclick="window.print()">🖨️ Print Ledger</button>
        <button class="print-button" onclick="window.close()">❌ Close</button>

        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Particulars</th>
              <th class="text-right">Debit (₹)</th>
              <th class="text-right">Credit (₹)</th>
              <th class="text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.entries.map(entry => `
              <tr>
                <td>${new Date(entry.date).toLocaleDateString()}</td>
                <td>
                  ${entry.particulars}
                  <br>
                  <span class="badge ${
                    entry.type === 'gst_invoice' ? 'badge-gst' : 
                    entry.type === 'non_gst_invoice' ? 'badge-non-gst' : 
                    'badge-payment'
                  }">
                    ${
                      entry.type === 'gst_invoice' ? 'GST Invoice' : 
                      entry.type === 'non_gst_invoice' ? 'Non-GST Invoice' : 
                      'Payment'
                    }
                  </span>
                </td>
                <td class="text-right ${entry.debit > 0 ? 'debit' : ''}">
                  ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                </td>
                <td class="text-right ${entry.credit > 0 ? 'credit' : ''}">
                  ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                </td>
                <td class="text-right balance">
                  ${formatCurrency(Math.abs(entry.balance))} ${entry.balance < 0 ? '(Cr)' : '(Dr)'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3 style="margin-top: 0; color: #1976d2;">Ledger Summary</h3>
          <div class="summary-row">
            <span class="label">Total Invoices:</span>
            <span class="debit">${formatCurrency(data.summary.totalInvoices)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Total Credits:</span>
            <span class="credit">${formatCurrency(data.summary.totalCredits)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Total Transactions:</span>
            <span>${data.summary.totalTransactions}</span>
          </div>
          <hr style="margin: 15px 0;">
          <div class="summary-row">
            <span class="label total-amount">Outstanding Balance:</span>
            <span class="total-amount ${data.summary.remainingPayment >= 0 ? 'debit' : 'credit'}">
              ${formatCurrency(Math.abs(data.summary.remainingPayment))} ${data.summary.remainingPayment < 0 ? '(Credit)' : '(Debit)'}
            </span>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>This is a computer-generated ledger statement.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Write content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Focus the window
    printWindow.focus();
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isGenerating) {
      setPreviewData(null);
      onClose();
    }
  };

  if (!customer) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LedgerIcon />
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Generate Customer Ledger
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {customer.name} - {customer.phone}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            
            {/* Filters Section - REMOVED EXCEL FORMAT */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Ledger Filters
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="dateFrom"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="From Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="dateTo"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="To Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Summary Section */}
            {(loadingPayments || loadingInvoices) ? (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={24} />
                      <Typography>
                        Loading {loadingPayments && loadingInvoices ? 'payment and invoice history' : loadingPayments ? 'payment history' : 'invoice history'}...
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ) : previewData ? (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Ledger Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="error.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(previewData.summary.totalInvoices)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Invoices
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(previewData.summary.totalCredits)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Credits
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="warning.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(previewData.summary.remainingPayment)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Remaining Balance
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="info.main" sx={{ fontWeight: 'bold' }}>
                            {previewData.summary.totalTransactions}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Transactions
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            {/* Preview Section */}
            {previewData && previewData.entries.length > 0 ? (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Ledger Preview ({previewData.entries.length} transactions)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Date</strong></TableCell>
                            <TableCell><strong>Particulars</strong></TableCell>
                            <TableCell align="right"><strong>Debit</strong></TableCell>
                            <TableCell align="right"><strong>Credit</strong></TableCell>
                            <TableCell align="right"><strong>Balance</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {previewData.entries.map((entry, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                {new Date(entry.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">
                                    {entry.particulars}
                                  </Typography>
                                  <Chip 
                                    label={
                                      entry.type === 'gst_invoice' ? 'GST Invoice' : 
                                      entry.type === 'non_gst_invoice' ? 'Non-GST Invoice' : 
                                      entry.type === 'payment' ? 'Payment' : 'Transaction'
                                    } 
                                    size="small" 
                                    color={
                                      entry.type === 'gst_invoice' ? 'error' : 
                                      entry.type === 'non_gst_invoice' ? 'warning' : 
                                      'success'
                                    }
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                {entry.debit > 0 ? (
                                  <Typography color="error.main" fontWeight="bold">
                                    {formatCurrency(entry.debit)}
                                  </Typography>
                                ) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                {entry.credit > 0 ? (
                                  <Typography color="success.main" fontWeight="bold">
                                    {formatCurrency(entry.credit)}
                                  </Typography>
                                ) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  fontWeight="bold"
                                  color={entry.balance >= 0 ? 'error.main' : 'success.main'}
                                >
                                  {formatCurrency(Math.abs(entry.balance))}
                                  {entry.balance < 0 ? ' (Cr)' : ' (Dr)'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            ) : previewData && (
              <Grid item xs={12}>
                <Alert severity="info">
                  No transactions found for the selected date range.
                </Alert>
              </Grid>
            )}

          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={isGenerating}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={isGenerating || !previewData || previewData.entries.length === 0}
            startIcon={isGenerating ? <CircularProgress size={20} /> : <PdfIcon />}
          >
            {isGenerating ? 'Generating...' : 'Generate PDF Ledger'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LedgerGenerator;