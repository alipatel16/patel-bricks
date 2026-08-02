import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../../services/queryUtils';

export const invoiceColors = {
  ink: '#172321',
  muted: '#5F6C69',
  line: '#CDD5D1',
  soft: '#F5F7F5',
  softWarm: '#FBF7F2',
  accent: '#A84F32',
  accentDark: '#74301F',
  green: '#2E6B60',
  navy: '#233E3B',
};

export const formatInvoiceDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (value) => {
  const number = Math.floor(value);
  if (number < 20) return ones[number];
  return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
};

const threeDigits = (value) => {
  const number = Math.floor(value);
  const hundred = Math.floor(number / 100);
  const remainder = number % 100;
  return `${hundred ? `${ones[hundred]} Hundred` : ''}${hundred && remainder ? ' ' : ''}${remainder ? twoDigits(remainder) : ''}`;
};

export const amountInWords = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0));
  if (!amount) return 'Rupees Zero Only';
  const parts = [];
  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const remainder = amount % 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remainder) parts.push(threeDigits(remainder));
  return `Rupees ${parts.join(' ')} Only`;
};

export const InvoiceCanvas = React.forwardRef(({ children }, ref) => (
  <Box
    ref={ref}
    className="invoice-print-area"
    sx={{
      width: '100%',
      maxWidth: '210mm',
      minHeight: 0,
      boxSizing: 'border-box',
      mx: 'auto',
      bgcolor: '#FFFFFF',
      color: invoiceColors.ink,
      border: `1px solid ${invoiceColors.line}`,
      boxShadow: '0 24px 64px rgba(23,35,33,.14)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      p: { xs: 2.2, sm: 3.0, md: 3.25 },
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: '0 0 auto 0',
        height: 9,
        background: `linear-gradient(90deg, ${invoiceColors.navy} 0 72%, ${invoiceColors.accent} 72% 100%)`,
      },
      '@media print': {
        width: '210mm',
        maxWidth: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        boxSizing: 'border-box',
        boxShadow: 'none',
        border: 'none',
        p: '7mm 8mm 6mm',
        overflow: 'hidden',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        pageBreakAfter: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      },
    }}
  >
    {children}
  </Box>
));

export const InvoiceTypeBadge = ({ label, number, date, tone = 'accent' }) => {
  const color = tone === 'green' ? invoiceColors.green : invoiceColors.accent;
  return (
    <Box sx={{ minWidth: { sm: 205 }, border: `1px solid ${invoiceColors.line}`, bgcolor: '#fff', alignSelf: 'stretch' }}>
      <Box sx={{ px: 1.8, py: 0.85, bgcolor: color, color: '#fff' }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.14em', textAlign: { xs: 'left', sm: 'right' } }}>{label}</Typography>
      </Box>
      <Box sx={{ px: 1.6, py: 1.1, textAlign: { xs: 'left', sm: 'right' } }}>
        <Typography sx={{ fontSize: 10, color: invoiceColors.muted, fontWeight: 800, letterSpacing: '.08em' }}>INVOICE NUMBER</Typography>
        <Typography sx={{ mt: 0.25, fontSize: 21, lineHeight: 1.12, fontWeight: 950, color: invoiceColors.ink, overflowWrap: 'anywhere' }}>{number || '—'}</Typography>
        <Typography variant="body2" sx={{ color: invoiceColors.muted, mt: 0.55 }}>{formatInvoiceDate(date)}</Typography>
      </Box>
    </Box>
  );
};

export const InfoPanel = ({ eyebrow, title, children, accent = false }) => (
  <Box sx={{ flex: 1, minWidth: 0, border: `1px solid ${accent ? 'rgba(168,79,50,.45)' : invoiceColors.line}`, bgcolor: '#fff' }}>
    <Box sx={{ px: 1.7, py: 0.8, bgcolor: accent ? invoiceColors.softWarm : invoiceColors.soft, borderBottom: `1px solid ${accent ? 'rgba(168,79,50,.3)' : invoiceColors.line}` }}>
      <Typography sx={{ color: accent ? invoiceColors.accentDark : invoiceColors.muted, fontSize: 9.5, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>{eyebrow}</Typography>
    </Box>
    <Box sx={{ px: 1.45, py: 1.05 }}>
      {title && <Typography sx={{ fontWeight: 950, fontSize: 16, color: invoiceColors.ink, overflowWrap: 'anywhere', lineHeight: 1.3 }}>{title}</Typography>}
      <Box sx={{ mt: title ? 0.45 : 0, color: invoiceColors.muted, '& .MuiTypography-root': { lineHeight: 1.42, fontSize: 11.8 } }}>{children}</Box>
    </Box>
  </Box>
);

export const SummaryRow = ({ label, value, strong = false, accent = false }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    spacing={2}
    sx={{
      minHeight: strong ? 46 : 32,
      py: strong ? 0.9 : 0.45,
      px: strong ? 1.35 : 0,
      borderTop: strong ? `2px solid ${accent ? invoiceColors.accent : invoiceColors.navy}` : 0,
      bgcolor: strong ? (accent ? invoiceColors.softWarm : invoiceColors.soft) : 'transparent',
      color: invoiceColors.ink,
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: strong ? 900 : 650, color: strong ? invoiceColors.ink : invoiceColors.muted }}>{label}</Typography>
    <Typography variant={strong ? 'h6' : 'body2'} sx={{ fontWeight: 950, color: accent && strong ? invoiceColors.accentDark : invoiceColors.ink, textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

export const AmountWords = ({ value }) => (
  <Box sx={{ mt: 1.35, border: `1px solid ${invoiceColors.line}`, borderLeft: `4px solid ${invoiceColors.accent}`, bgcolor: '#fff', p: 1.15 }}>
    <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: invoiceColors.muted, textTransform: 'uppercase', letterSpacing: '.12em' }}>Amount in words</Typography>
    <Typography variant="body2" sx={{ mt: 0.45, fontWeight: 850, color: invoiceColors.ink }}>{amountInWords(value)}</Typography>
  </Box>
);

export const BankAndTerms = ({ bank, terms = [], showBank = true, showTerms = true }) => {
  if (!showBank && !showTerms) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: showBank && showTerms ? '1fr 1.25fr' : '1fr' }, gap: 1.5, mt: 1.7 }}>
      {showBank && (
        <InfoPanel eyebrow="Bank details" title={bank?.bankName || 'Payment details'}>
          {bank?.accountName && <Typography variant="body2">Account name: {bank.accountName}</Typography>}
          {bank?.accountNumber && <Typography variant="body2">A/C No: {bank.accountNumber}</Typography>}
          {bank?.ifscCode && <Typography variant="body2">IFSC: {bank.ifscCode}</Typography>}
          {bank?.branch && <Typography variant="body2">Branch: {bank.branch}</Typography>}
          {!bank?.accountName && !bank?.accountNumber && !bank?.ifscCode && !bank?.branch && (
            <Typography variant="body2">Payment details are available on request.</Typography>
          )}
        </InfoPanel>
      )}
      {showTerms && (
        <InfoPanel eyebrow="Terms and conditions" title="Commercial terms">
          <Stack spacing={0.3}>
            {(terms || []).slice(0, 4).map((term, index) => <Typography key={`${term}-${index}`} variant="body2">{index + 1}. {term}</Typography>)}
            {!terms?.length && <Typography variant="body2">Goods once sold will not be taken back.</Typography>}
          </Stack>
        </InfoPanel>
      )}
    </Box>
  );
};

export const ComputerGeneratedFooter = () => (
  <Box sx={{ mt: 'auto', pt: 1.2, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
    <Divider sx={{ borderColor: invoiceColors.line }} />
    <Box sx={{ py: 0.85, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: invoiceColors.muted, fontWeight: 850 }}>
        This is a computer-generated invoice and does not require a signature.
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.18, color: invoiceColors.accentDark, fontWeight: 900, letterSpacing: '.035em' }}>
        Thank you for your business
      </Typography>
    </Box>
  </Box>
);

export const currency = formatCurrency;
