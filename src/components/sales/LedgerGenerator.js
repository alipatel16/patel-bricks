// components/sales/LedgerGenerator.js - Customer Ledger Generator Component
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
  TableChart as ExcelIcon,
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

  // Form management for date range
  const {
    control,
    handleSubmit,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      dateFrom: '',
      dateTo: new Date().toISOString().split('T')[0],
      format: 'pdf',
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
          .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));

        setGeneratedInvoices(customerInvoices);
      } else {
        setGeneratedInvoices([]);
      }
      setLoadingInvoices(false);

    } catch (error) {
      console.error('Error fetching payment and invoice history:', error);
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
      filteredInvoices = filteredInvoices.filter(invoice => invoice.createdDate >= watchedValues.dateFrom);
      filteredPayments = filteredPayments.filter(payment => payment.date >= watchedValues.dateFrom);
    }

    if (watchedValues.dateTo) {
      filteredInvoices = filteredInvoices.filter(invoice => invoice.createdDate <= watchedValues.dateTo);
      filteredPayments = filteredPayments.filter(payment => payment.date <= watchedValues.dateTo);
    }

    // Create ledger entries
    const ledgerEntries = [];

    // Add generated invoices as debit entries
    filteredInvoices.forEach(invoice => {
      const invoiceData = invoice.invoiceData;
      if (!invoiceData) return;

      // Add GST invoice entry if exists
      if (invoice.gstBricks > 0) {
        ledgerEntries.push({
          date: invoice.createdDate,
          particulars: `GST Invoice - ${formatQuantity(invoice.gstBricks)} bricks @ ${formatCurrency(invoiceData.actualRate)} each (with 12% GST)`,
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
          date: invoice.createdDate,
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

      if (data.format === 'pdf') {
        await generatePDFLedger(documentData);
      } else {
        await generateExcelLedger(documentData);
      }

      toast.success(`${data.format.toUpperCase()} ledger generated successfully`);

    } catch (error) {
      console.error('Error generating ledger:', error);
      toast.error('Failed to generate ledger');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate PDF Ledger
  const generatePDFLedger = async (data) => {
    // TODO: Implement PDF generation using jsPDF or similar library
    // This is a placeholder for the actual PDF generation logic
    console.log('Generating PDF Ledger:', data);
    
    // Example of what the PDF generation might look like:
    /*
    const jsPDF = require('jspdf');
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Customer Ledger', 20, 20);
    
    // Add customer info
    doc.setFontSize(12);
    doc.text(`Customer: ${data.customer.name}`, 20, 40);
    doc.text(`Phone: ${data.customer.phone}`, 20, 50);
    
    // Add summary
    doc.text(`Total Invoices: ${formatCurrency(data.summary.totalInvoices)}`, 20, 70);
    doc.text(`Total Credits: ${formatCurrency(data.summary.totalCredits)}`, 20, 80);
    doc.text(`Remaining Balance: ${formatCurrency(data.summary.remainingPayment)}`, 20, 90);
    
    // Add table (simplified)
    // ... table generation logic
    
    doc.save(`ledger_${data.customer.name}_${Date.now()}.pdf`);
    */
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  // Generate Excel Ledger
  const generateExcelLedger = async (data) => {
    // TODO: Implement Excel generation using xlsx library
    console.log('Generating Excel Ledger:', data);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1500));
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
            
            {/* Filters Section */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Ledger Filters
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="format"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Export Format</InputLabel>
                            <Select {...field} label="Export Format">
                              <MenuItem value="pdf">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PdfIcon /> PDF
                                </Box>
                              </MenuItem>
                              <MenuItem value="excel">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ExcelIcon /> Excel
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
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
            startIcon={isGenerating ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {isGenerating ? 'Generating...' : `Generate ${watchedValues.format?.toUpperCase()}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LedgerGenerator;