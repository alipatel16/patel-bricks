// InvoiceReports.js - Fixed component with proper invoice viewing functionality
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Print as PrintIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Receipt as InvoiceIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { formatCurrency, formatQuantity } from "../../utils/calculations";
import { dbUtils } from "../../services/firebase";
import { DB_PATHS } from "../../utils/constants";

// Import the GSTInvoiceViewer component (same as CustomerList uses)
import GSTInvoiceViewer from './GSTInvoiceViewer';

function InvoiceReports({
  searchFilters,
  setSearchFilters,
  onViewInvoice, // This prop can be removed as we'll handle viewing internally
}) {
  const theme = useTheme();
  
  // State for invoice data
  const [invoiceReports, setInvoiceReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // NEW: Invoice viewing states (matching CustomerList pattern)
  const [invoiceViewDialogOpen, setInvoiceViewDialogOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);
  const [gstInvoiceViewerOpen, setGstInvoiceViewerOpen] = useState(false);
  const [nonGstInvoiceViewerOpen, setNonGstInvoiceViewerOpen] = useState(false);
  const [viewingInvoiceData, setViewingInvoiceData] = useState(null);

  // Fetch invoice reports from Firebase with better error handling
  const fetchInvoiceReports = async () => {
    try {
      setLoading(true);
      
      const result = await dbUtils.readData(`${DB_PATHS.SALES}/invoices`);
      
      if (result.success && result.data) {
        const invoices = Object.entries(result.data)
          .map(([id, invoice]) => ({
            ...invoice,
            id,
            // Map the data structure to match what we expect
            invoice_number: invoice.gstInvoiceNumber || `INV-${id.substring(0, 8)}`,
            date: invoice.createdDate,
            customer_name: invoice.customerName,
            total_amount: invoice.invoiceData?.gstData?.grandTotal || 
                         invoice.invoiceData?.nonGstData?.grandTotal || 
                         invoice.invoiceData?.totalAmount || 0,
            invoice_type: (invoice.gstBricks && invoice.gstBricks > 0) ? "GST" : "NON_GST",
          }))
          .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

        setInvoiceReports(invoices);
      } else {
        setInvoiceReports([]);
      }
    } catch (error) {
      console.error("Error fetching invoice reports:", error);
      setInvoiceReports([]);
      toast.error("Failed to load invoice reports");
    } finally {
      setLoading(false);
    }
  };

  // Load invoices when component mounts
  useEffect(() => {
    fetchInvoiceReports();
  }, []);

  // Filter invoices based on search criteria
  const filteredInvoices = invoiceReports.filter((invoice) => {
    const matchesSearch = !searchFilters.searchTerm || 
      invoice.invoice_number?.toLowerCase().includes(searchFilters.searchTerm.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchFilters.searchTerm.toLowerCase());
    
    const matchesType = !searchFilters.invoiceType || 
      invoice.invoice_type === searchFilters.invoiceType;
    
    const matchesDateFrom = !searchFilters.dateFrom || 
      invoice.date >= searchFilters.dateFrom;
    
    const matchesDateTo = !searchFilters.dateTo || 
      invoice.date <= searchFilters.dateTo;
    
    return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
  });

  // Pagination handlers
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // NEW: View invoice details handler (matching CustomerList pattern)
  const handleViewInvoiceDetails = (invoice) => {
    setSelectedInvoiceForView(invoice);
    setViewingInvoiceData(invoice.invoiceData);
    setInvoiceViewDialogOpen(true);
  };

  // NEW: Direct invoice viewers (matching CustomerList pattern)
  const handleViewGSTInvoice = () => {
    if (viewingInvoiceData && selectedInvoiceForView) {
      setGstInvoiceViewerOpen(true);
    }
  };

  const handleViewNonGSTInvoice = () => {
    if (viewingInvoiceData && selectedInvoiceForView) {
      setNonGstInvoiceViewerOpen(true);
    }
  };

  const handleCloseInvoiceViewers = () => {
    setGstInvoiceViewerOpen(false);
    setNonGstInvoiceViewerOpen(false);
  };

  const handleCloseInvoiceViewDialog = () => {
    setInvoiceViewDialogOpen(false);
    setSelectedInvoiceForView(null);
    setViewingInvoiceData(null);
  };

  // NEW: Enhanced print functionality using the invoice viewer's print capability
  const handlePrintInvoice = (invoice) => {
    // First, set up the invoice data for viewing
    setSelectedInvoiceForView(invoice);
    setViewingInvoiceData(invoice.invoiceData);
    
    // Determine which type of invoice to print based on available data
    const hasGSTBricks = invoice.gstBricks && invoice.gstBricks > 0;
    const hasNonGSTBricks = invoice.nonGstBricks && invoice.nonGstBricks > 0;
    
    if (hasGSTBricks && hasNonGSTBricks) {
      // If both types exist, show dialog to let user choose
      setInvoiceViewDialogOpen(true);
      toast.info("This invoice has both GST and Non-GST components. Please select which one to print from the view dialog.");
    } else if (hasGSTBricks) {
      // Print GST invoice directly
      setTimeout(() => {
        setGstInvoiceViewerOpen(true);
        // The GSTInvoiceViewer component should handle the printing automatically
      }, 100);
    } else if (hasNonGSTBricks) {
      // Print Non-GST invoice directly
      setTimeout(() => {
        setNonGstInvoiceViewerOpen(true);
        // The GSTInvoiceViewer component should handle the printing automatically
      }, 100);
    } else {
      toast.error("No invoice data available for printing");
    }
  };

  // Refresh data handler
  const handleRefreshData = () => {
    fetchInvoiceReports();
  };

  // Show loading spinner if data is being fetched
  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
                {/* <Typography sx={{ ml: 2 }}>Loading invoice reports...</Typography> */}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {/* Filter Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Invoice Filters
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshData}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchFilters.searchTerm}
                    onChange={(e) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        searchTerm: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <select
                    value={searchFilters.invoiceType || ""}
                    onChange={(e) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        invoiceType: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">All Invoice Types</option>
                    <option value="GST">GST Invoices</option>
                    <option value="NON_GST">Non-GST Invoices</option>
                  </select>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <input
                    type="date"
                    placeholder="From Date"
                    value={searchFilters.dateFrom}
                    onChange={(e) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        dateFrom: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <input
                    type="date"
                    placeholder="To Date"
                    value={searchFilters.dateTo}
                    onChange={(e) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Reports List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" fontWeight="bold">
                  Generated Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {filteredInvoices.length} invoices
                </Typography>
              </Box>

              {/* Invoice Table */}
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Invoice Number
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Date
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Customer
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Type
                      </th>
                      <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #ddd" }}>
                        Amount
                      </th>
                      <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #ddd" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                          No invoices generated yet
                        </td>
                      </tr>
                    ) : (
                      paginatedInvoices.map((invoice, index) => (
                        <tr key={invoice.id || index} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "12px" }}>
                            <Typography variant="body2" fontWeight="medium">
                              {invoice.invoice_number}
                            </Typography>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <Typography variant="body2">
                              {new Date(invoice.date).toLocaleDateString()}
                            </Typography>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <Typography variant="body2">
                              {invoice.customer_name}
                            </Typography>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: "12px",
                                fontWeight: "medium",
                                backgroundColor: invoice.invoice_type === "GST" 
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.info.main, 0.1),
                                color: invoice.invoice_type === "GST" 
                                  ? theme.palette.success.main
                                  : theme.palette.info.main,
                              }}
                            >
                              {invoice.invoice_type === "GST" ? "GST" : "Non-GST"}
                            </Box>
                          </td>
                          <td style={{ padding: "12px", textAlign: "right" }}>
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(invoice.total_amount)}
                            </Typography>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                              <Tooltip title="View Invoice">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewInvoiceDetails(invoice)}
                                  color="primary"
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Print Invoice">
                                <IconButton
                                  size="small"
                                  onClick={() => handlePrintInvoice(invoice)}
                                  color="secondary"
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>

              {/* Pagination */}
              {filteredInvoices.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Per page</InputLabel>
                      <Select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        label="Per page"
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoice View Dialog (matching CustomerList pattern) */}
      <Dialog
        open={invoiceViewDialogOpen}
        onClose={handleCloseInvoiceViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InvoiceIcon color="primary" />
              <Typography variant="h6">
                Invoice Details
              </Typography>
            </Box>
            <IconButton onClick={handleCloseInvoiceViewDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoiceForView && viewingInvoiceData ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary for {selectedInvoiceForView.customerName}
                </Typography>
                <Typography variant="body2">
                  Generated on {new Date(selectedInvoiceForView.createdDate).toLocaleDateString()} 
                  for the period {selectedInvoiceForView.fromDate} to {selectedInvoiceForView.toDate}
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="error">
                        GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong> {formatQuantity(selectedInvoiceForView.gstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong> {formatCurrency(viewingInvoiceData.actualRate)} per brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (with 12% GST):</strong> {formatCurrency(viewingInvoiceData.gstAmount)}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<ViewIcon />}
                          onClick={handleViewGSTInvoice}
                          disabled={selectedInvoiceForView.gstBricks === 0}
                          size="small"
                        >
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="success.main">
                        Non-GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong> {formatQuantity(selectedInvoiceForView.nonGstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong> {formatCurrency(viewingInvoiceData.actualRate)} per brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (without GST):</strong> {formatCurrency(viewingInvoiceData.nonGstAmount)}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ViewIcon />}
                          onClick={handleViewNonGSTInvoice}
                          disabled={selectedInvoiceForView.nonGstBricks === 0}
                          size="small"
                        >
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Invoice Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Total Bricks</Typography>
                          <Typography variant="h6">{formatQuantity(viewingInvoiceData.totalBricks)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">GST Amount</Typography>
                          <Typography variant="h6" color="error.main">{formatCurrency(viewingInvoiceData.gstAmount)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Non-GST Amount</Typography>
                          <Typography variant="h6" color="success.main">{formatCurrency(viewingInvoiceData.nonGstAmount)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                          <Typography variant="h6" color="primary.main">{formatCurrency(viewingInvoiceData.totalAmount)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography>No invoice data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInvoiceViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* GST Invoice Viewers for direct viewing and printing (matching CustomerList pattern) */}
      {viewingInvoiceData && selectedInvoiceForView && (
        <>
          <GSTInvoiceViewer
            open={gstInvoiceViewerOpen}
            onClose={handleCloseInvoiceViewers}
            customerData={viewingInvoiceData.customerData}
            invoiceData={viewingInvoiceData}
            brickQuantity={selectedInvoiceForView.gstBricks}
            pricePerBrick={viewingInvoiceData.actualRate}
            isGSTInvoice={true}
          />

          <GSTInvoiceViewer
            open={nonGstInvoiceViewerOpen}
            onClose={handleCloseInvoiceViewers}
            customerData={viewingInvoiceData.customerData}
            invoiceData={viewingInvoiceData}
            brickQuantity={selectedInvoiceForView.nonGstBricks}
            pricePerBrick={viewingInvoiceData.actualRate}
            isGSTInvoice={false}
          />
        </>
      )}
    </>
  );
}

export default InvoiceReports;