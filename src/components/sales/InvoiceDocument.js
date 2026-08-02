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

const InvoiceDocument = React.forwardRef(({ sale, settings }, ref) => {
  if (!sale) return null;

  const company = settings?.company || {};
  const bank = settings?.bank || {};
  const invoice = settings?.invoice || {};
  const format = invoice.invoiceFormat || {};
  const taxableAmount = Number(sale.taxableAmount ?? Math.max(0, Number(sale.grossAmount || 0) - Number(sale.discountAmount || 0)));
  const paymentStatus = Number(sale.balanceDue || 0) <= 0
    ? 'PAID'
    : Number(sale.paidAmount || 0) > 0
      ? 'PARTIALLY PAID'
      : 'PAYMENT DUE';
  const statusColor = paymentStatus === 'PAID'
    ? invoiceColors.green
    : paymentStatus === 'PARTIALLY PAID'
      ? '#95631A'
      : '#A64040';
  const taxLabel = !sale.isGst
    ? 'Non-GST'
    : sale.interstate
      ? `IGST ${sale.igstRate || sale.gstRate || invoice.igstRate || 0}%`
      : `CGST ${sale.cgstRate || invoice.cgstRate || 0}% + SGST ${sale.sgstRate || invoice.sgstRate || 0}%`;

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
          {sale.isGst && company.gstin && <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 900, color: invoiceColors.ink }}>GSTIN: {company.gstin}</Typography>}
        </Box>
        <InvoiceTypeBadge label={sale.isGst ? 'TAX INVOICE' : 'SALES INVOICE'} number={sale.invoiceNumber} date={sale.date} tone={sale.isGst ? 'accent' : 'green'} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mt: 1.6, py: 0.85, px: 1.35, bgcolor: invoiceColors.soft, borderTop: `1px solid ${invoiceColors.line}`, borderBottom: `1px solid ${invoiceColors.line}` }}>
        <Typography variant="caption" sx={{ color: invoiceColors.muted, fontWeight: 800 }}>Supply type: <Box component="span" sx={{ color: invoiceColors.ink }}>{taxLabel}</Box></Typography>
        <Typography variant="caption" sx={{ color: statusColor, fontWeight: 950, letterSpacing: '.08em' }}>{paymentStatus}</Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1.7 }}>
        {format.showCustomerDetails !== false && (
          <InfoPanel eyebrow="Bill to" title={sale.customerName} accent>
            <Typography variant="body2">{sale.customerAddress || sale.location || 'Address not available'}</Typography>
            {sale.customerPhone && <Typography variant="body2">Phone: {sale.customerPhone}</Typography>}
            {sale.isGst && sale.customerGstin && <Typography variant="body2" sx={{ fontWeight: 900 }}>GSTIN: {sale.customerGstin}</Typography>}
          </InfoPanel>
        )}
        <InfoPanel eyebrow="Dispatch details" title={sale.location || 'Delivery site'}>
          <Typography variant="body2">Vehicle number: {sale.vehicleNumber || '—'}</Typography>
          <Typography variant="body2">Challan number: {sale.challanNumber || '—'}</Typography>
          <Typography variant="body2">Mode of transport: {company.transportationMode || invoice.defaultTransportMode || 'BY ROAD'}</Typography>
          {sale.notes && <Typography variant="body2">Remarks: {sale.notes}</Typography>}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1.65fr) .58fr .56fr .62fr .62fr .85fr', gap: 0, alignItems: 'stretch', minHeight: 62 }}>
          <Typography sx={{ p: 1.2, textAlign: 'center', fontWeight: 800, borderRight: `1px solid ${invoiceColors.line}` }}>1</Typography>
          <Box sx={{ p: 1.35, borderRight: `1px solid ${invoiceColors.line}` }}>
            <Typography sx={{ fontWeight: 950, fontSize: 14.5 }}>{sale.productName || invoice.productName || 'FLY ASH BRICKS'}</Typography>
          </Box>
          <Typography sx={{ p: 1.05, textAlign: 'center', fontWeight: 900, borderRight: `1px solid ${invoiceColors.line}` }}>{sale.hsnCode || invoice.hsnCode || '6815'}</Typography>
          <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 850, borderRight: `1px solid ${invoiceColors.line}` }}>{formatNumber(sale.quantity)}</Typography>
          <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 850, borderRight: `1px solid ${invoiceColors.line}` }}>{formatCurrency(sale.rate)}</Typography>
          <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 800, borderRight: `1px solid ${invoiceColors.line}`, color: invoiceColors.muted }}>{sale.isGst ? `${sale.gstRate || invoice.gstRate || 12}%` : '—'}</Typography>
          <Typography sx={{ p: 1.2, textAlign: 'right', fontWeight: 950 }}>{formatCurrency(sale.grossAmount)}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 320px' }, gap: 2, mt: 1.8, alignItems: 'start' }}>
        <Box>
          <Box sx={{ border: `1px solid ${invoiceColors.line}`, bgcolor: invoiceColors.soft, p: 1.2 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.12em', color: invoiceColors.muted }}>SUPPLY SUMMARY</Typography>
            <Stack spacing={0.55} sx={{ mt: 0.9 }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Total bricks</Typography><Typography variant="body2" sx={{ fontWeight: 900 }}>{formatNumber(sale.quantity)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Rate per brick</Typography><Typography variant="body2" sx={{ fontWeight: 900 }}>{formatCurrency(sale.rate)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Payment method</Typography><Typography variant="body2" sx={{ fontWeight: 900, textTransform: 'capitalize' }}>{String(sale.paymentMethod || 'credit').replaceAll('_', ' ')}</Typography></Stack>
            </Stack>
          </Box>
          <AmountWords value={sale.totalAmount} />
        </Box>

        <Box>
          <SummaryRow label="Gross amount" value={formatCurrency(sale.grossAmount)} />
          {Number(sale.discountAmount) > 0 && <SummaryRow label="Discount" value={`− ${formatCurrency(sale.discountAmount)}`} />}
          <SummaryRow label="Taxable value" value={formatCurrency(taxableAmount)} />
          {sale.isGst && !sale.interstate && Number(sale.cgstAmount) > 0 && <SummaryRow label={`CGST @ ${sale.cgstRate || invoice.cgstRate || 0}%`} value={formatCurrency(sale.cgstAmount)} />}
          {sale.isGst && !sale.interstate && Number(sale.sgstAmount) > 0 && <SummaryRow label={`SGST @ ${sale.sgstRate || invoice.sgstRate || 0}%`} value={formatCurrency(sale.sgstAmount)} />}
          {sale.isGst && sale.interstate && Number(sale.igstAmount) > 0 && <SummaryRow label={`IGST @ ${sale.igstRate || sale.gstRate || invoice.igstRate || 0}%`} value={formatCurrency(sale.igstAmount)} />}
          <Divider sx={{ my: 0.7, borderColor: invoiceColors.line }} />
          <SummaryRow label="Invoice total" value={formatCurrency(sale.totalAmount)} strong accent />
          <SummaryRow label="Amount received" value={formatCurrency(sale.paidAmount)} />
          <SummaryRow label="Balance due" value={formatCurrency(sale.balanceDue)} strong />
        </Box>
      </Box>

      <BankAndTerms bank={bank} terms={invoice.terms} showBank={format.showBankDetails !== false} showTerms={format.showTerms !== false} />
      <ComputerGeneratedFooter />
    </InvoiceCanvas>
  );
});

export default InvoiceDocument;
