import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { formatCurrency, formatNumber } from '../../services/queryUtils';
import {
  AmountWords,
  BankAndTerms,
  InfoPanel,
  InvoiceCanvas,
  InvoiceTypeBadge,
  ComputerGeneratedFooter,
  SummaryRow,
  invoiceColors,
} from './InvoiceDesign';

const GeneratedInvoiceDocument = React.forwardRef(({ invoice, settings, component = 'combined' }, ref) => {
  if (!invoice) return null;

  const company = settings?.company || {};
  const bank = settings?.bank || {};
  const config = settings?.invoice || {};
  const format = config.invoiceFormat || {};
  const showGst = component !== 'nonGst' && Number(invoice.gstBricks) > 0;
  const showNonGst = component !== 'gst' && Number(invoice.nonGstBricks) > 0;
  const customerData = invoice.originalInvoiceData?.customerData || {};
  const gstTaxable = Number(invoice.gstTaxableAmount ?? invoice.originalInvoiceData?.gstTaxableAmount ?? (Number(invoice.gstBricks || 0) * Number(invoice.rate || 0)));
  const gstTax = Number(invoice.gstTaxAmount ?? invoice.originalInvoiceData?.gstTaxAmount ?? Math.max(0, Number(invoice.gstAmount || 0) - gstTaxable));
  const visibleTotal = (showGst ? Number(invoice.gstAmount || 0) : 0) + (showNonGst ? Number(invoice.nonGstAmount || 0) : 0);
  const title = component === 'gst'
    ? 'GST TAX INVOICE'
    : component === 'nonGst'
      ? 'NON-GST INVOICE'
      : showGst && showNonGst
        ? 'CONSOLIDATED INVOICE'
        : showGst
          ? 'GST TAX INVOICE'
          : 'NON-GST INVOICE';
  const invoiceNumber = showGst ? invoice.gstInvoiceNumber : `NG-${String(invoice.id || '').slice(-8).toUpperCase()}`;
  const totalVisibleBricks = (showGst ? Number(invoice.gstBricks || 0) : 0) + (showNonGst ? Number(invoice.nonGstBricks || 0) : 0);

  const rows = [
    showGst && {
      key: 'gst',
      description: `${config.productName || 'FLY ASH BRICKS'} · GST`,
      hsnCode: invoice.hsnCode || config.hsnCode || '6815',
      detail: 'Taxable supply',
      quantity: Number(invoice.gstBricks || 0),
      rate: Number(invoice.rate || 0),
      tax: `${invoice.gstRate || config.gstRate || 12}%`,
      amount: gstTaxable,
    },
    showNonGst && {
      key: 'non-gst',
      description: `${config.productName || 'FLY ASH BRICKS'} · Non-GST`,
      hsnCode: invoice.hsnCode || config.hsnCode || '6815',
      detail: 'Commercial supply',
      quantity: Number(invoice.nonGstBricks || 0),
      rate: Number(invoice.rate || 0),
      tax: '—',
      amount: Number(invoice.nonGstAmount || 0),
    },
  ].filter(Boolean);

  return (
    <InvoiceCanvas ref={ref}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2.4} alignItems={{ sm: 'stretch' }} sx={{ pt: 0.7 }}>
        <Box sx={{ minWidth: 0, borderLeft: `5px solid ${invoiceColors.accent}`, pl: 1.8 }}>
          <Typography sx={{ fontSize: { xs: 27, sm: 32 }, fontWeight: 950, color: invoiceColors.navy, lineHeight: 1.02, letterSpacing: '-.025em' }}>
            {company.name || 'PATEL BRICKS'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.65, maxWidth: 465, color: invoiceColors.muted, lineHeight: 1.42 }}>{company.address || '—'}</Typography>
          <Typography variant="body2" sx={{ mt: 0.25, color: invoiceColors.muted }}>
            {company.phone ? `Phone: ${company.phone}` : ''}{company.phone && company.email ? '  •  ' : ''}{company.email ? `Email: ${company.email}` : ''}
          </Typography>
          {showGst && company.gstin && <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 900, color: invoiceColors.ink }}>GSTIN: {company.gstin}</Typography>}
        </Box>
        <InvoiceTypeBadge label={title} number={invoiceNumber} date={invoice.date || invoice.invoiceDate} tone={showGst ? 'accent' : 'green'} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mt: 1.6, py: 0.85, px: 1.35, bgcolor: invoiceColors.soft, borderTop: `1px solid ${invoiceColors.line}`, borderBottom: `1px solid ${invoiceColors.line}` }}>
        <Typography variant="caption" sx={{ color: invoiceColors.muted, fontWeight: 800 }}>
          Invoice coverage: <Box component="span" sx={{ color: invoiceColors.ink }}>{invoice.fromDate || invoice.originalInvoiceData?.dateRange?.from || '—'} to {invoice.toDate || invoice.originalInvoiceData?.dateRange?.to || '—'}</Box>
        </Typography>
        <Typography variant="caption" sx={{ color: showGst ? invoiceColors.accentDark : invoiceColors.green, fontWeight: 950, letterSpacing: '.08em' }}>{showGst ? 'GST INVOICE' : 'NON-GST INVOICE'}</Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1.7 }}>
        {format.showCustomerDetails !== false && (
          <InfoPanel eyebrow="Bill to" title={invoice.customerName || customerData.name} accent>
            <Typography variant="body2">{customerData.address || invoice.customerAddress || invoice.selectedSite || 'Address not available'}</Typography>
            {(invoice.customerPhone || customerData.phone) && <Typography variant="body2">Phone: {invoice.customerPhone || customerData.phone}</Typography>}
            {showGst && (invoice.customerGstin || customerData.gstin) && <Typography variant="body2" sx={{ fontWeight: 900 }}>GSTIN: {invoice.customerGstin || customerData.gstin}</Typography>}
          </InfoPanel>
        )}
        <InfoPanel eyebrow="Invoice details" title={invoice.selectedSite || 'All sites'}>
          <Typography variant="body2">Linked sales: {formatNumber(invoice.saleIds?.length || 0)}</Typography>
          <Typography variant="body2">Rate applied: {formatCurrency(invoice.rate)} per brick</Typography>
          <Typography variant="body2">Total bricks: {formatNumber(totalVisibleBricks)}</Typography>
          {invoice.notes && <Typography variant="body2">Remarks: {invoice.notes}</Typography>}
        </InfoPanel>
      </Box>

      <Box sx={{ mt: 1.8, border: `1px solid ${invoiceColors.line}` }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1.65fr) .58fr .56fr .62fr .62fr .85fr', gap: 0, bgcolor: invoiceColors.navy, color: '#fff' }}>
          {['#', 'Description', 'HSN/SAC', 'Qty.', 'Rate', 'Tax', 'Amount'].map((label, index) => (
            <Typography key={label} sx={{ px: index === 1 ? 1.4 : 0.8, py: 1.05, fontSize: 9.5, fontWeight: 900, letterSpacing: '.09em', textAlign: index > 2 ? 'right' : index === 0 || index === 2 ? 'center' : 'left', borderRight: index < 6 ? '1px solid rgba(255,255,255,.16)' : 0 }}>
              {label.toUpperCase()}
            </Typography>
          ))}
        </Box>
        {rows.map((row, index) => (
          <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1.65fr) .58fr .56fr .62fr .62fr .85fr', gap: 0, alignItems: 'stretch', minHeight: 60, borderTop: index ? `1px solid ${invoiceColors.line}` : 0 }}>
            <Typography sx={{ p: 1.2, textAlign: 'center', fontWeight: 800, borderRight: `1px solid ${invoiceColors.line}` }}>{index + 1}</Typography>
            <Box sx={{ p: 1.35, borderRight: `1px solid ${invoiceColors.line}` }}><Typography sx={{ fontWeight: 950, fontSize: 14.5 }}>{row.description}</Typography><Typography variant="caption" sx={{ color: invoiceColors.muted }}>{row.detail}</Typography></Box>
            <Typography sx={{ p: 1.05, textAlign: 'center', fontWeight: 900, borderRight: `1px solid ${invoiceColors.line}` }}>{row.hsnCode}</Typography>
            <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 850, borderRight: `1px solid ${invoiceColors.line}` }}>{formatNumber(row.quantity)}</Typography>
            <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 850, borderRight: `1px solid ${invoiceColors.line}` }}>{formatCurrency(row.rate)}</Typography>
            <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 800, borderRight: `1px solid ${invoiceColors.line}`, color: invoiceColors.muted }}>{row.tax}</Typography>
            <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 950 }}>{formatCurrency(row.amount)}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 320px' }, gap: 2, mt: 1.8, alignItems: 'start' }}>
        <Box>
          <Box sx={{ border: `1px solid ${invoiceColors.line}`, bgcolor: invoiceColors.soft, p: 1.2 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.12em', color: invoiceColors.muted }}>QUANTITY SUMMARY</Typography>
            <Stack spacing={0.55} sx={{ mt: 0.9 }}>
              {showGst && <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">GST bricks</Typography><Typography variant="body2" sx={{ fontWeight: 900 }}>{formatNumber(invoice.gstBricks)}</Typography></Stack>}
              {showNonGst && <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Non-GST bricks</Typography><Typography variant="body2" sx={{ fontWeight: 900 }}>{formatNumber(invoice.nonGstBricks)}</Typography></Stack>}
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Total visible bricks</Typography><Typography variant="body2" sx={{ fontWeight: 950 }}>{formatNumber(totalVisibleBricks)}</Typography></Stack>
            </Stack>
          </Box>
          <AmountWords value={visibleTotal} />
        </Box>

        <Box>
          {showGst && <SummaryRow label="GST taxable value" value={formatCurrency(gstTaxable)} />}
          {showGst && <SummaryRow label={`GST @ ${invoice.gstRate || config.gstRate || 12}%`} value={formatCurrency(gstTax)} />}
          {showGst && <SummaryRow label="GST invoice value" value={formatCurrency(invoice.gstAmount)} />}
          {showNonGst && <SummaryRow label="Non-GST value" value={formatCurrency(invoice.nonGstAmount)} />}
          <Divider sx={{ my: 0.7, borderColor: invoiceColors.line }} />
          <SummaryRow label="Invoice total" value={formatCurrency(visibleTotal)} strong accent />
        </Box>
      </Box>

      <BankAndTerms bank={bank} terms={config.terms} showBank={format.showBankDetails !== false} showTerms={format.showTerms !== false} />
      <ComputerGeneratedFooter />
    </InvoiceCanvas>
  );
});

export default GeneratedInvoiceDocument;
