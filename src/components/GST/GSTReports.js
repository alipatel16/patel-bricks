// components/reports/GSTReports.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  alpha,
  useTheme,
  TextField,
  Divider,
} from "@mui/material";
import {
  TrendingUp as OutwardIcon,
  TrendingDown as InwardIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  AccountBalance as TaxIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/calculations";
import { supplierService } from "../../services/supplierService";
import { dbUtils } from "../../services/firebase";
import * as XLSX from "xlsx";
import { GST_REPORT_TYPES, DB_PATHS } from "../../utils/constants";

const GSTReports = () => {
  const theme = useTheme();

  // State for date filters
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return date.toISOString().split("T")[0]; // Start of current month as string
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split("T")[0]; // Today as string
  });
  const [reportType, setReportType] = useState("GSTR3B");

  // Data states
  const [loading, setLoading] = useState(true);
  const [gstData, setGstData] = useState({
    outward: [], // Sales data (GSTR-1)
    inward: [], // Purchase data (GSTR-2)
    summary: {
      total_outward_taxable: 0,
      total_outward_gst: 0,
      total_inward_taxable: 0,
      total_inward_gst: 0,
      net_gst_liability: 0,
    },
  });

  // Load GST data
  useEffect(() => {
    loadGSTData();
  }, [fromDate, toDate]);

  const loadGSTData = async () => {
    try {
      setLoading(true);

      const fromDateStr = fromDate; // Already in YYYY-MM-DD format
      const toDateStr = toDate; // Already in YYYY-MM-DD format

      // FIXED: Get invoice data instead of raw sales data
      const invoicesResult = await dbUtils.readData(
        `${DB_PATHS.SALES}/invoices`
      );

      // Get purchase data (inward supplies) - this part stays the same
      const purchasesResult = await supplierService.getPurchasesByDateRange(
        fromDateStr,
        toDateStr
      );

      let outwardSupplies = [];
      let inwardSupplies = [];

      // FIXED: Process invoice data for outward supplies (GST invoices only)
      if (invoicesResult.success && invoicesResult.data) {
        Object.entries(invoicesResult.data).forEach(([id, invoice]) => {
          // Only process invoices with GST component and within date range
          if (invoice.gstBricks && invoice.gstBricks > 0) {
            const invoiceDate = invoice.invoiceData?.invoiceDate || invoice.createdDate; // Assuming this is in YYYY-MM-DD format

            // Check if invoice is within the selected date range
            if (invoiceDate >= fromDate && invoiceDate <= toDate) {
              const gstAmount = invoice.invoiceData?.gstAmount || 0;
              const taxableValue = gstAmount / 1.12; // Reverse calculate (assuming 12% GST)
              const totalGST = gstAmount - taxableValue;

              outwardSupplies.push({
                id: `${id}_GST`,
                date: invoiceDate,
                customer_name: invoice.customerName,
                customer_gstin:
                  invoice.invoiceData?.customerData?.gstin || "UNREGISTERED",
                invoice_number:
                  invoice.gstInvoiceNumber || `GST-${id.substring(0, 8)}`,
                taxable_value: taxableValue,
                cgst_rate: 6, // 6% CGST for 12% total GST
                sgst_rate: 6, // 6% SGST for 12% total GST
                igst_rate: 0,
                cgst_amount: totalGST / 2, // Split GST equally between CGST and SGST
                sgst_amount: totalGST / 2,
                igst_amount: 0,
                total_gst: totalGST,
                total_value: gstAmount,
                place_of_supply:
                  invoice.invoiceData?.customerData?.state_code || "24", // Use customer's state
                supply_type: "taxable",
                bricks: invoice.gstBricks,
                rate_per_brick: invoice.invoiceData?.actualRate || 0,
              });
            }
          }
        });
      }

      // Process purchase data for inward supplies (this part stays the same)
      if (purchasesResult.success && purchasesResult.data) {
        inwardSupplies = purchasesResult.data.map((purchase) => ({
          id: purchase.id,
          date: purchase.date,
          supplier_name: purchase.supplier_name,
          supplier_gstin: purchase.supplier_gstin || "UNREGISTERED",
          bill_number: purchase.bill_number || `BILL-${purchase.id}`,
          taxable_value: purchase.amount || 0,
          cgst_rate: purchase.cgst || 0,
          sgst_rate: purchase.sgst || 0,
          igst_rate: purchase.igst || 0,
          cgst_amount: purchase.cgst_amount || 0,
          sgst_amount: purchase.sgst_amount || 0,
          igst_amount: purchase.igst_amount || 0,
          total_gst: purchase.total_gst || 0,
          total_value: purchase.total_amount || 0,
          place_of_supply: "24", // Should be dynamic based on supplier
          supply_type: purchase.total_gst > 0 ? "taxable" : "exempt",
        }));
      }

      // Calculate summary
      const summary = {
        total_outward_taxable: outwardSupplies.reduce(
          (sum, item) => sum + item.taxable_value,
          0
        ),
        total_outward_gst: outwardSupplies.reduce(
          (sum, item) => sum + item.total_gst,
          0
        ),
        total_inward_taxable: inwardSupplies.reduce(
          (sum, item) => sum + item.taxable_value,
          0
        ),
        total_inward_gst: inwardSupplies.reduce(
          (sum, item) => sum + item.total_gst,
          0
        ),
      };

      summary.net_gst_liability =
        summary.total_outward_gst - summary.total_inward_gst;

      setGstData({
        outward: outwardSupplies,
        inward: inwardSupplies,
        summary,
      });
    } catch (error) {
      console.error("Error loading GST data:", error);
      toast.error("Failed to load GST data");
    } finally {
      setLoading(false);
    }
  };

  // Excel export function with proper formatting
  const exportToExcel = () => {
    try {
      // Import XLSX library (add this import at the top of your file)
      // import * as XLSX from 'xlsx';

      const fileName = `GST_${reportType}_${fromDate}_to_${toDate}.xlsx`;
      const workbook = XLSX.utils.book_new();

      if (reportType === "GSTR1") {
        // GSTR-1 Report
        const wsData = [
          ["GSTR-1: Outward Supplies Report"],
          [`Period: ${fromDate} to ${toDate}`],
          [], // Empty row
          [
            "Date",
            "Invoice No.",
            "Customer",
            "GSTIN",
            "Bricks",
            "Rate per Brick",
            "Taxable Value",
            "CGST",
            "SGST",
            "Total Amount",
          ],
        ];

        // Add data rows
        gstData.outward.forEach((item) => {
          wsData.push([
            new Date(item.date).toLocaleDateString(),
            item.invoice_number,
            item.customer_name,
            item.customer_gstin,
            item.bricks || "",
            item.rate_per_brick || "",
            item.taxable_value || 0,
            item.cgst_amount || 0,
            item.sgst_amount || 0,
            item.total_value || 0,
          ]);
        });

        // Add summary section
        wsData.push([]);
        wsData.push(["Summary"]);
        wsData.push([
          "Total Taxable Value",
          gstData.summary.total_outward_taxable,
        ]);
        wsData.push(["Total GST Amount", gstData.summary.total_outward_gst]);
        wsData.push(["Total Invoices", gstData.outward.length]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Apply formatting
        ws["A1"] = {
          v: "GSTR-1: Outward Supplies Report",
          t: "s",
          s: { font: { bold: true, sz: 16 } },
        };
        ws["A2"] = {
          v: `Period: ${fromDate} to ${toDate}`,
          t: "s",
          s: { font: { bold: true } },
        };

        // Set column widths
        ws["!cols"] = [
          { wch: 12 }, // Date
          { wch: 15 }, // Invoice No
          { wch: 20 }, // Customer
          { wch: 15 }, // GSTIN
          { wch: 10 }, // Bricks
          { wch: 12 }, // Rate
          { wch: 15 }, // Taxable Value
          { wch: 10 }, // CGST
          { wch: 10 }, // SGST
          { wch: 15 }, // Total
        ];

        XLSX.utils.book_append_sheet(workbook, ws, "GSTR-1");
      } else if (reportType === "GSTR2") {
        // GSTR-2 Report
        const wsData = [
          ["GSTR-2: Inward Supplies Report"],
          [`Period: ${fromDate} to ${toDate}`],
          [],
          [
            "Date",
            "Bill No.",
            "Supplier",
            "GSTIN",
            "Taxable Value",
            "CGST",
            "SGST",
            "IGST",
            "Total Amount",
            "Type",
          ],
        ];

        gstData.inward.forEach((item) => {
          wsData.push([
            new Date(item.date).toLocaleDateString(),
            item.bill_number,
            item.supplier_name,
            item.supplier_gstin,
            item.taxable_value || 0,
            item.cgst_amount || 0,
            item.sgst_amount || 0,
            item.igst_amount || 0,
            item.total_value || 0,
            item.supply_type,
          ]);
        });

        wsData.push([]);
        wsData.push(["Summary"]);
        wsData.push([
          "Total Taxable Value",
          gstData.summary.total_inward_taxable,
        ]);
        wsData.push(["Total GST Amount", gstData.summary.total_inward_gst]);
        wsData.push(["Total Transactions", gstData.inward.length]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["A1"] = {
          v: "GSTR-2: Inward Supplies Report",
          t: "s",
          s: { font: { bold: true, sz: 16 } },
        };
        ws["A2"] = {
          v: `Period: ${fromDate} to ${toDate}`,
          t: "s",
          s: { font: { bold: true } },
        };

        ws["!cols"] = [
          { wch: 12 }, // Date
          { wch: 15 }, // Bill No
          { wch: 20 }, // Supplier
          { wch: 15 }, // GSTIN
          { wch: 15 }, // Taxable Value
          { wch: 10 }, // CGST
          { wch: 10 }, // SGST
          { wch: 10 }, // IGST
          { wch: 15 }, // Total
          { wch: 10 }, // Type
        ];

        XLSX.utils.book_append_sheet(workbook, ws, "GSTR-2");
      } else if (reportType === "GSTR3B") {
        // GSTR-3B Summary Sheet
        const summaryData = [
          ["GSTR-3B: Monthly Return Summary"],
          [`Period: ${fromDate} to ${toDate}`],
          [],
          ["Summary"],
          ["Description", "Amount"],
          [
            "Outward Supplies - Taxable Value",
            gstData.summary.total_outward_taxable,
          ],
          ["Outward Supplies - GST Amount", gstData.summary.total_outward_gst],
          ["Total GST Invoices", gstData.outward.length],
          [],
          [
            "Inward Supplies - Taxable Value",
            gstData.summary.total_inward_taxable,
          ],
          ["Inward Supplies - GST Amount", gstData.summary.total_inward_gst],
          ["Total Purchase Transactions", gstData.inward.length],
          [],
          ["Net GST Liability"],
          ["Output GST", gstData.summary.total_outward_gst],
          ["Input GST", gstData.summary.total_inward_gst],
          ["Net GST Payable", gstData.summary.net_gst_liability],
          [
            "Status",
            gstData.summary.net_gst_liability >= 0 ? "Payable" : "Refundable",
          ],
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs["A1"] = {
          v: "GSTR-3B: Monthly Return Summary",
          t: "s",
          s: { font: { bold: true, sz: 16 } },
        };
        summaryWs["A2"] = {
          v: `Period: ${fromDate} to ${toDate}`,
          t: "s",
          s: { font: { bold: true } },
        };
        summaryWs["!cols"] = [{ wch: 30 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

        // Add Outward Supplies sheet if data exists
        if (gstData.outward.length > 0) {
          const outwardData = [
            ["Outward Supplies (GST Invoices)"],
            [],
            [
              "Date",
              "Invoice No.",
              "Customer",
              "GSTIN",
              "Bricks",
              "Rate per Brick",
              "Taxable Value",
              "CGST",
              "SGST",
              "Total Amount",
            ],
          ];

          gstData.outward.forEach((item) => {
            outwardData.push([
              new Date(item.date).toLocaleDateString(),
              item.invoice_number,
              item.customer_name,
              item.customer_gstin,
              item.bricks || "",
              item.rate_per_brick || "",
              item.taxable_value || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.total_value || 0,
            ]);
          });

          const outwardWs = XLSX.utils.aoa_to_sheet(outwardData);
          outwardWs["A1"] = {
            v: "Outward Supplies (GST Invoices)",
            t: "s",
            s: { font: { bold: true, sz: 14 } },
          };
          outwardWs["!cols"] = [
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
          ];

          XLSX.utils.book_append_sheet(workbook, outwardWs, "Outward Supplies");
        }

        // Add Inward Supplies sheet if data exists
        if (gstData.inward.length > 0) {
          const inwardData = [
            ["Inward Supplies (Purchases)"],
            [],
            [
              "Date",
              "Bill No.",
              "Supplier",
              "GSTIN",
              "Taxable Value",
              "CGST",
              "SGST",
              "IGST",
              "Total Amount",
              "Type",
            ],
          ];

          gstData.inward.forEach((item) => {
            inwardData.push([
              new Date(item.date).toLocaleDateString(),
              item.bill_number,
              item.supplier_name,
              item.supplier_gstin,
              item.taxable_value || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.igst_amount || 0,
              item.total_value || 0,
              item.supply_type,
            ]);
          });

          const inwardWs = XLSX.utils.aoa_to_sheet(inwardData);
          inwardWs["A1"] = {
            v: "Inward Supplies (Purchases)",
            t: "s",
            s: { font: { bold: true, sz: 14 } },
          };
          inwardWs["!cols"] = [
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 10 },
          ];

          XLSX.utils.book_append_sheet(workbook, inwardWs, "Inward Supplies");
        }
      }

      // Generate and download the file
      XLSX.writeFile(workbook, fileName);
      toast.success("Excel report downloaded successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    }
  };

  // Updated export handler - removed print functionality
  const handleExportReport = () => {
    console.log("Export button clicked");

    // Direct Excel export - no more print option
    if (gstData.outward.length === 0 && gstData.inward.length === 0) {
      toast.error("No data available to export for the selected period");
      return;
    }

    exportToExcel();
  };

  const getSupplyTypeColor = (type) => {
    return type === "taxable" ? "success" : "default";
  };

  const renderGSTR1Table = () => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{ backgroundColor: alpha(theme.palette.success.main, 0.05) }}
          >
            <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Invoice No.</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>GSTIN</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Bricks</TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              Rate
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              Taxable Value
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              CGST
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              SGST
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gstData.outward.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {item.invoice_number}
                </Typography>
              </TableCell>
              <TableCell>{item.customer_name}</TableCell>
              <TableCell>
                <Typography variant="caption" fontFamily="monospace">
                  {item.customer_gstin}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {item.bricks?.toLocaleString()} bricks
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {formatCurrency(item.rate_per_brick)}/brick
                </Typography>
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.taxable_value)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.cgst_amount)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.sgst_amount)}
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatCurrency(item.total_value)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
          {gstData.outward.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  No GST invoices found for the selected period
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGSTR2Table = () => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{ backgroundColor: alpha(theme.palette.warning.main, 0.05) }}
          >
            <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Bill No.</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Supplier</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>GSTIN</TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              Taxable Value
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              CGST
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              SGST
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              IGST
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="right">
              Total
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gstData.inward.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.bill_number}</TableCell>
              <TableCell>{item.supplier_name}</TableCell>
              <TableCell>
                <Typography variant="caption" fontFamily="monospace">
                  {item.supplier_gstin}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.taxable_value)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.cgst_amount)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.sgst_amount)}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.igst_amount)}
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatCurrency(item.total_value)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.supply_type}
                  color={getSupplyTypeColor(item.supply_type)}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
          {gstData.inward.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  No inward supplies found for the selected period
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGSTR3BSummary = () => (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      {/* Outward Supplies Summary */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main" gutterBottom>
              <OutwardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Outward Supplies (GST Invoices)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Taxable Value
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(gstData.summary.total_outward_taxable)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  GST Amount
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {formatCurrency(gstData.summary.total_outward_gst)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Total GST Invoices
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {gstData.outward.length}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Inward Supplies Summary */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main" gutterBottom>
              <InwardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Inward Supplies (Purchases)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Taxable Value
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(gstData.summary.total_inward_taxable)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  GST Amount
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {formatCurrency(gstData.summary.total_inward_gst)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Total Transactions
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {gstData.inward.length}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Net GST Liability */}
      <Grid item xs={12}>
        <Card sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom>
              <TaxIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Net GST Liability
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Output GST
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatCurrency(gstData.summary.total_outward_gst)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="text.secondary">
                  -
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Input GST
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {formatCurrency(gstData.summary.total_inward_gst)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="text.secondary">
                  =
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Net GST Payable
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  color={
                    gstData.summary.net_gst_liability >= 0
                      ? "error.main"
                      : "success.main"
                  }
                >
                  {formatCurrency(Math.abs(gstData.summary.net_gst_liability))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {gstData.summary.net_gst_liability >= 0
                    ? "Payable"
                    : "Refundable"}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading GST data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          GST Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate and view GST compliance reports based on your issued invoices
          and purchase records
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Outward Supplies:</strong> Data is sourced from GST invoices
            you have generated through the Invoice Management system.
            <br />
            <strong>Inward Supplies:</strong> Data is sourced from purchase
            records in Supplier Management.
          </Typography>
        </Alert>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Report Type"
              >
                {Object.entries(GST_REPORT_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportReport}
              fullWidth
            >
              Export Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Content */}
      <Paper sx={{ p: 3 }}>
        {reportType === "GSTR1" && (
          <>
            <Typography variant="h6" gutterBottom>
              <OutwardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              GSTR-1: Outward Supplies (GST Invoices)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Details of outward supplies from GST invoices generated
            </Typography>
            {renderGSTR1Table()}
          </>
        )}

        {reportType === "GSTR2" && (
          <>
            <Typography variant="h6" gutterBottom>
              <InwardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              GSTR-2: Inward Supplies (Purchases)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Details of inward supplies of goods and services
            </Typography>
            {renderGSTR2Table()}
          </>
        )}

        {reportType === "GSTR3B" && (
          <>
            <Typography variant="h6" gutterBottom>
              <ReportIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              GSTR-3B: Monthly Return Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Summary of outward and inward supplies with net GST liability
            </Typography>
            {renderGSTR3BSummary()}

            <Divider sx={{ my: 3 }} />

            {/* Detailed Tables */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Detailed Transactions
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Outward Supplies (GST Invoices)
            </Typography>
            {renderGSTR1Table()}

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Inward Supplies (Purchases)
            </Typography>
            {renderGSTR2Table()}
          </>
        )}

        {reportType === "GSTR9" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              GSTR-9: Annual Return
            </Typography>
            <Typography>
              Annual return functionality is coming soon. This will include
              year-end reconciliation and detailed annual GST summary.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Footer Note */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> These reports are generated based on your GST
          invoices and purchase data. Please verify all details before filing
          your GST returns. For complex scenarios, consult with your tax
          advisor.
        </Typography>
      </Alert>
    </Box>
  );
};

export default GSTReports;
