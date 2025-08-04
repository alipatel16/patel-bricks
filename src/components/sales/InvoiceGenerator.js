// components/sales/InvoiceGenerator.js - Updated with GST Invoice Numbering and GSTIN functionality + All Sites Support + Date Selection + Disable Non-GST Option
import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Numbers as NumberIcon,
  CalendarToday as CalendarIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { formatCurrency, formatQuantity } from "../../utils/calculations";
import { DB_PATHS } from "../../utils/constants";
import { dbUtils } from "../../services/firebase";

// Import the existing GST Invoice Viewer
import GSTInvoiceViewer from "./GSTInvoiceViewer";

const InvoiceGenerator = ({
  open,
  onClose,
  customer,
  salesHistory,
  // Props for editing existing invoice
  editingInvoice = null,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState({
    fromDate: "",
    toDate: "",
    selectedSite: "",
    gstBricks: "",
    nonGstBricks: "",
    // NEW: Invoice date field
    invoiceDate: new Date().toISOString().split('T')[0], // Default to today
  });

  // NEW: State for disabling non-GST invoice generation
  const [disableNonGST, setDisableNonGST] = useState(false);

  const [showInvoice, setShowInvoice] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [customerSites, setCustomerSites] = useState([]);

  // Firebase save states
  const [isSaving, setIsSaving] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);

  // Invoice viewer states
  const [gstInvoiceViewerOpen, setGstInvoiceViewerOpen] = useState(false);
  const [nonGstInvoiceViewerOpen, setNonGstInvoiceViewerOpen] = useState(false);

  // Customer GSTIN state
  const [customerGSTIN, setCustomerGSTIN] = useState("");
  const [loadingGSTIN, setLoadingGSTIN] = useState(false);

  // NEW: GST Invoice numbering states
  const [gstInvoiceConfig, setGstInvoiceConfig] = useState(null);
  const [loadingInvoiceConfig, setLoadingInvoiceConfig] = useState(false);
  const [nextGstInvoiceNumber, setNextGstInvoiceNumber] = useState("");

  // NEW: Fetch GST invoice configuration from settings
  useEffect(() => {
    const fetchInvoiceConfig = async () => {
      if (!open) return;

      try {
        setLoadingInvoiceConfig(true);
        const result = await dbUtils.readData("settings/invoice_config");

        if (result.success && result.data && result.data.gstInvoiceNumbering) {
          setGstInvoiceConfig(result.data.gstInvoiceNumbering);

          // Generate next GST invoice number
          const prefix = result.data.gstInvoiceNumbering.prefix || "GST-INV";
          const currentNumber =
            result.data.gstInvoiceNumbering.currentNumber || 1;
          setNextGstInvoiceNumber(`${prefix}-${currentNumber}`);
        } else {
          // Use default config if not found
          const defaultConfig = {
            prefix: "GST-INV",
            currentNumber: 1,
            autoIncrement: true,
          };
          setGstInvoiceConfig(defaultConfig);
          setNextGstInvoiceNumber(
            `${defaultConfig.prefix}-${defaultConfig.currentNumber}`
          );
        }
      } catch (error) {
        // Fallback to default
        const defaultConfig = {
          prefix: "GST-INV",
          currentNumber: 1,
          autoIncrement: true,
        };
        setGstInvoiceConfig(defaultConfig);
        setNextGstInvoiceNumber(
          `${defaultConfig.prefix}-${defaultConfig.currentNumber}`
        );
      } finally {
        setLoadingInvoiceConfig(false);
      }
    };

    fetchInvoiceConfig();
  }, [open]);

  // Fetch customer GSTIN from Firebase
  useEffect(() => {
    const fetchCustomerGSTIN = async () => {
      if (!customer || !open) return;

      try {
        setLoadingGSTIN(true);

        // Generate customer ID using phone number (as per customerService.js)
        const customerId = customer.phone;
        const result = await dbUtils.readData(
          `${DB_PATHS.CUSTOMERS}/${customerId}`
        );

        if (result.success && result.data && result.data.gstin) {
          setCustomerGSTIN(result.data.gstin);
        } else {
          setCustomerGSTIN("");
        }
      } catch (error) {
        setCustomerGSTIN("");
      } finally {
        setLoadingGSTIN(false);
      }
    };

    fetchCustomerGSTIN();
  }, [customer, open]);

  // FIXED: Load existing invoice data if in edit mode but ALWAYS show form first
  useEffect(() => {
    if (isEditMode && editingInvoice && open) {
      // Pre-populate form data
      setFormData({
        fromDate: editingInvoice.fromDate || "",
        toDate: editingInvoice.toDate || "",
        selectedSite: editingInvoice.selectedSite || "",
        gstBricks: editingInvoice.gstBricks?.toString() || "",
        nonGstBricks: editingInvoice.nonGstBricks?.toString() || "",
        // NEW: Load existing invoice date or default to today
        invoiceDate: editingInvoice.invoiceData?.invoiceDate || new Date().toISOString().split('T')[0],
      });
      setSavedInvoiceId(editingInvoice.id);

      // FIXED: Always show form first in edit mode, never auto-show invoice
      setShowInvoice(false);
      setGeneratedInvoiceData(null);
    } else {
      // Reset for new invoice generation
      setFormData({
        fromDate: "",
        toDate: "",
        selectedSite: "",
        gstBricks: "",
        nonGstBricks: "",
        // NEW: Default to today's date for new invoices
        invoiceDate: new Date().toISOString().split('T')[0],
      });
      setShowInvoice(false);
      setGeneratedInvoiceData(null);
      setSavedInvoiceId(null);
      // NEW: Reset disable non-GST option
      setDisableNonGST(false);
    }
  }, [isEditMode, editingInvoice, open]);

  // Get customer sites from sales history
  useEffect(() => {
    if (customer && salesHistory) {
      const customerSales = salesHistory.filter(
        (sale) =>
          sale.customer_name === customer.name &&
          sale.customer_phone === customer.phone
      );

      const sites = [
        ...new Set(
          customerSales.map((sale) => sale.location_name).filter(Boolean)
        ),
      ];
      setCustomerSites(sites);
    }
  }, [customer, salesHistory]);

  // Calculate customer sales data - UPDATED to support "All Sites"
  const customerSalesData = useMemo(() => {
    if (
      !customer ||
      !salesHistory ||
      !formData.fromDate ||
      !formData.toDate ||
      !formData.selectedSite
    ) {
      return { sales: [], totalBricks: 0, totalAmount: 0, averageRate: 0 };
    }

    const customerSales = salesHistory.filter(
      (sale) =>
        sale.customer_name === customer.name &&
        sale.customer_phone === customer.phone &&
        // UPDATED: Handle "All Sites" selection
        (formData.selectedSite === "all" || sale.location_name === formData.selectedSite) &&
        sale.date >= formData.fromDate &&
        sale.date <= formData.toDate
    );

    const totalBricks = customerSales.reduce(
      (sum, sale) => sum + parseInt(sale.quantity || 0),
      0
    );
    const totalAmount = customerSales.reduce(
      (sum, sale) => sum + parseFloat(sale.total_amount || 0),
      0
    );
    const averageRate = totalBricks > 0 ? totalAmount / totalBricks : 0;

    return {
      sales: customerSales,
      totalBricks,
      totalAmount,
      averageRate,
    };
  }, [
    customer,
    salesHistory,
    formData.fromDate,
    formData.toDate,
    formData.selectedSite,
  ]);

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.fromDate) errors.fromDate = "From date is required";
    if (!formData.toDate) errors.toDate = "To date is required";
    if (!formData.selectedSite) errors.selectedSite = "Please select a site";
    // NEW: Validate invoice date
    if (!formData.invoiceDate) errors.invoiceDate = "Invoice date is required";

    if (
      formData.fromDate &&
      formData.toDate &&
      formData.fromDate > formData.toDate
    ) {
      errors.dateRange = "From date must be before to date";
    }

    const gstBricks = parseInt(formData.gstBricks || 0);
    const nonGstBricks = parseInt(formData.nonGstBricks || 0);
    const totalInputBricks = gstBricks + nonGstBricks;

    if (totalInputBricks === 0) {
      errors.bricks =
        "Please specify at least some bricks for GST or Non-GST invoice";
    }

    if (totalInputBricks > customerSalesData.totalBricks) {
      errors.bricks = `Total bricks (${totalInputBricks}) cannot exceed customer's purchases (${customerSalesData.totalBricks})`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    if (field === "gstBricks" || field === "nonGstBricks") {
      handleBrickQuantityChange(field, value);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // UPDATED: Modified to handle disable non-GST option
  const handleBrickQuantityChange = (field, value) => {
    const totalCustomerBricks = customerSalesData.totalBricks;

    if (value === "") {
      // NEW: If disableNonGST is true, don't auto-clear non-GST field
      if (disableNonGST && field === "gstBricks") {
        setFormData((prev) => ({
          ...prev,
          [field]: "",
          // Don't auto-clear nonGstBricks when disableNonGST is true
        }));
      } else {
        const otherField = field === "gstBricks" ? "nonGstBricks" : "gstBricks";
        setFormData((prev) => ({
          ...prev,
          [field]: "",
          [otherField]: "",
        }));
      }
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) return;

    if (totalCustomerBricks > 0) {
      // NEW: Check if non-GST is disabled
      if (disableNonGST && field === "gstBricks") {
        // Only update GST bricks, don't auto-calculate non-GST
        setFormData((prev) => ({
          ...prev,
          [field]: value,
          // Keep nonGstBricks as is or set to 0 if empty
          nonGstBricks: prev.nonGstBricks || "0",
        }));
      } else if (disableNonGST && field === "nonGstBricks") {
        // If non-GST is disabled, don't allow changes to nonGstBricks
        return;
      } else {
        // Original logic for when non-GST is enabled
        const otherField = field === "gstBricks" ? "nonGstBricks" : "gstBricks";
        const currentValue = parseInt(value || 0);
        const remaining = totalCustomerBricks - currentValue;

        setFormData((prev) => ({
          ...prev,
          [field]: value,
          [otherField]: remaining >= 0 ? remaining.toString() : "0",
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // NEW: Handle disable non-GST toggle
  const handleDisableNonGSTChange = (event) => {
    const isDisabled = event.target.checked;
    setDisableNonGST(isDisabled);

    if (isDisabled) {
      // When disabling non-GST, clear the non-GST bricks field
      setFormData((prev) => ({
        ...prev,
        nonGstBricks: "0",
      }));
    }
  };

  // Generate invoice - UPDATED to handle "All Sites" and custom invoice date
  const handleGenerateInvoice = () => {
    if (!validateForm()) return;

    const gstBricks = parseInt(formData.gstBricks || 0);
    const nonGstBricks = parseInt(formData.nonGstBricks || 0);
    const actualRate = customerSalesData.averageRate;

    // Enhanced customer data with GSTIN - UPDATED to handle "All Sites"
    const enhancedCustomerData = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      // UPDATED: Handle "All Sites" in address
      address: formData.selectedSite === "all" ? "All Sites" : formData.selectedSite,
      gstin: customerGSTIN || "", // Include GSTIN from fetched data
    };

    const invoiceData = {
      customerData: enhancedCustomerData,
      dateRange: {
        from: formData.fromDate,
        to: formData.toDate,
      },
      // UPDATED: Handle "All Sites" in selectedSite
      selectedSite: formData.selectedSite === "all" ? "All Sites" : formData.selectedSite,
      gstBricks,
      nonGstBricks,
      actualRate,
      totalBricks: gstBricks + nonGstBricks,
      gstAmount: gstBricks * actualRate * 1.12,
      nonGstAmount: nonGstBricks * actualRate,
      totalAmount: gstBricks * actualRate * 1.12 + nonGstBricks * actualRate,
      generatedOn: new Date().toISOString(),
      // Include customer GSTIN specifically for GST invoice processing
      customerGSTIN: customerGSTIN || "",
      // NEW: Include GST invoice number only if GST bricks > 0
      gstInvoiceNumber: gstBricks > 0 ? nextGstInvoiceNumber : null,
      // NEW: Include custom invoice date
      invoiceDate: formData.invoiceDate,
    };

    setGeneratedInvoiceData(invoiceData);
    setShowInvoice(true);
  };

  // NEW: Auto-increment GST invoice number
  const incrementGstInvoiceNumber = async () => {
    if (!gstInvoiceConfig || !gstInvoiceConfig.autoIncrement) return;

    try {
      const newNumber = gstInvoiceConfig.currentNumber + 1;
      const updatedConfig = {
        ...gstInvoiceConfig,
        currentNumber: newNumber,
      };

      // Update the settings in Firebase
      const result = await dbUtils.readData("settings/invoice_config");
      if (result.success && result.data) {
        const updatedInvoiceConfig = {
          ...result.data,
          gstInvoiceNumbering: updatedConfig,
        };

        await dbUtils.writeData(
          "settings/invoice_config",
          updatedInvoiceConfig
        );
      }
    } catch (error) {
      console.error("Error incrementing GST invoice number:", error);
    }
  };

  // Save invoice to Firebase
  const handleSaveInvoice = async () => {
    if (!generatedInvoiceData) {
      toast.error("Please generate invoice first");
      return;
    }

    try {
      setIsSaving(true);

      const invoiceId =
        savedInvoiceId ||
        `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentDate = new Date().toISOString().split("T")[0];
      const timestamp = Date.now();

      const invoiceRecord = {
        id: invoiceId,
        customerId: `${customer.name}_${customer.phone}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        // Include customer GSTIN in saved record
        customerGSTIN: customerGSTIN || "",

        // Form data
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        selectedSite: formData.selectedSite,
        gstBricks: parseInt(formData.gstBricks || 0),
        nonGstBricks: parseInt(formData.nonGstBricks || 0),
        // NEW: Save custom invoice date
        invoiceDate: formData.invoiceDate,

        // NEW: Include GST invoice number only if GST bricks were generated
        gstInvoiceNumber: generatedInvoiceData.gstInvoiceNumber || null,

        // Generated invoice data
        invoiceData: generatedInvoiceData,

        // Metadata
        type: "generated_invoice",
        status: "completed",
        createdDate: currentDate,
        updatedDate: currentDate,
        timestamp: timestamp,
        updatedTimestamp: timestamp,
        createdBy: "system",
      };

      // Save to Firebase
      const invoicesPath = `${DB_PATHS.SALES}/invoices/${invoiceId}`;
      const result = await dbUtils.writeData(invoicesPath, invoiceRecord);

      if (result.success) {
        setSavedInvoiceId(invoiceId);

        // NEW: Auto-increment GST invoice number only if this was a new GST invoice
        if (!isEditMode && generatedInvoiceData.gstInvoiceNumber) {
          await incrementGstInvoiceNumber();
        }

        toast.success(
          isEditMode
            ? "Invoice updated successfully"
            : "Invoice saved successfully"
        );
      } else {
        throw new Error(result.error || "Failed to save invoice");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isSaving) {
      setFormData({
        fromDate: "",
        toDate: "",
        selectedSite: "",
        gstBricks: "",
        nonGstBricks: "",
        invoiceDate: new Date().toISOString().split('T')[0], // Reset to today
      });
      setShowInvoice(false);
      setGeneratedInvoiceData(null);
      setValidationErrors({});
      setSavedInvoiceId(null);
      setCustomerGSTIN(""); // Reset GSTIN
      setNextGstInvoiceNumber(""); // Reset invoice number
      setDisableNonGST(false); // NEW: Reset disable non-GST option
      onClose();
    }
  };

  // Handle view invoices
  const handleViewGSTInvoice = () => setGstInvoiceViewerOpen(true);
  const handleViewNonGSTInvoice = () => setNonGstInvoiceViewerOpen(true);
  const handleCloseGSTInvoice = () => setGstInvoiceViewerOpen(false);
  const handleCloseNonGSTInvoice = () => setNonGstInvoiceViewerOpen(false);

  // FIXED: Handle back to form from generated invoice view
  const handleBackToForm = () => {
    setShowInvoice(false);
    setGeneratedInvoiceData(null);
  };

  if (!customer) return null;

  // Show generated invoice interface
  if (showInvoice && generatedInvoiceData) {
    return (
      <>
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="lg"
          fullWidth
          sx={{ zIndex: 1300 }}
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h6">
                  {isEditMode ? "Invoice Updated" : "Invoice Generated"} for{" "}
                  {customer.name}
                </Typography>
              </Box>
              <IconButton onClick={handleClose} disabled={isSaving}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box sx={{ p: 2 }}>
              <Alert
                severity={savedInvoiceId ? "info" : "success"}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" gutterBottom>
                  {savedInvoiceId
                    ? "Invoice Ready for Update"
                    : "Invoice Successfully Generated!"}
                </Typography>
                <Typography variant="body2">
                  {savedInvoiceId
                    ? "Make any changes and save to update the invoice."
                    : "Your invoice has been generated. You can view or save it now."}
                </Typography>
                {/* Show GSTIN status */}
                {customerGSTIN && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, fontWeight: "bold", color: "success.main" }}
                  >
                    ✓ Customer GSTIN ({customerGSTIN}) will be included in GST
                    invoices
                  </Typography>
                )}
                {!customerGSTIN && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, fontWeight: "bold", color: "warning.main" }}
                  >
                    ⚠ No GSTIN found - GST invoice will show as unregistered
                    customer
                  </Typography>
                )}
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="error">
                        GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong>{" "}
                        {formatQuantity(generatedInvoiceData.gstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong>{" "}
                        {formatCurrency(generatedInvoiceData.actualRate)} per
                        brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (with 12% GST):</strong>{" "}
                        {formatCurrency(generatedInvoiceData.gstAmount)}
                      </Typography>
                      {/* Show customer GSTIN status for GST invoice */}
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, fontStyle: "italic" }}
                      >
                        <strong>Customer GSTIN:</strong>{" "}
                        {customerGSTIN || "Not available"}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<ViewIcon />}
                          onClick={handleViewGSTInvoice}
                          disabled={generatedInvoiceData.gstBricks === 0}
                          fullWidth
                        >
                          View GST Invoice
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color="success.main"
                      >
                        Non-GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong>{" "}
                        {formatQuantity(generatedInvoiceData.nonGstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong>{" "}
                        {formatCurrency(generatedInvoiceData.actualRate)} per
                        brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (without GST):</strong>{" "}
                        {formatCurrency(generatedInvoiceData.nonGstAmount)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, fontStyle: "italic" }}
                      >
                        <strong>Note:</strong> No GSTIN or invoice number
                        required for non-GST invoice
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ViewIcon />}
                          onClick={handleViewNonGSTInvoice}
                          disabled={generatedInvoiceData.nonGstBricks === 0}
                          fullWidth
                        >
                          View Non-GST Invoice
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
                          <Typography variant="body2" color="text.secondary">
                            Total Bricks
                          </Typography>
                          <Typography variant="h6">
                            {formatQuantity(generatedInvoiceData.totalBricks)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            GST Amount
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {formatCurrency(generatedInvoiceData.gstAmount)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Non-GST Amount
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(generatedInvoiceData.nonGstAmount)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Total Amount
                          </Typography>
                          <Typography variant="h6" color="primary.main">
                            {formatCurrency(generatedInvoiceData.totalAmount)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleBackToForm} disabled={isSaving}>
              Back to Edit
            </Button>
            <Button onClick={handleClose} disabled={isSaving}>
              Close
            </Button>
            <Button
              onClick={handleSaveInvoice}
              variant="contained"
              disabled={isSaving}
              startIcon={
                isSaving ? <CircularProgress size={20} /> : <SaveIcon />
              }
            >
              {isSaving
                ? "Saving..."
                : savedInvoiceId
                ? "Update Invoice"
                : "Save Invoice"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* GST Invoice Viewer - NOW INCLUDES CUSTOMER GSTIN AND INVOICE NUMBER */}
        {generatedInvoiceData && (
          <GSTInvoiceViewer
            open={gstInvoiceViewerOpen}
            onClose={handleCloseGSTInvoice}
            customerData={{
              ...generatedInvoiceData.customerData,
              gstin: customerGSTIN || "", // Pass GSTIN for GST invoice
            }}
            invoiceData={{
              ...generatedInvoiceData,
              actualInvoiceNumber: generatedInvoiceData.gstInvoiceNumber || "",
            }}
            brickQuantity={generatedInvoiceData.gstBricks}
            pricePerBrick={generatedInvoiceData.actualRate}
            isGSTInvoice={true}
          />
        )}

        {/* Non-GST Invoice Viewer - NO GSTIN OR INVOICE NUMBER */}
        {generatedInvoiceData && (
          <GSTInvoiceViewer
            open={nonGstInvoiceViewerOpen}
            onClose={handleCloseNonGSTInvoice}
            customerData={{
              ...generatedInvoiceData.customerData,
              gstin: "", // Explicitly no GSTIN for non-GST invoice
            }}
            invoiceData={{
              ...generatedInvoiceData,
              invoiceNumber: "", // No invoice number for non-GST
            }}
            brickQuantity={generatedInvoiceData.nonGstBricks}
            pricePerBrick={generatedInvoiceData.actualRate}
            isGSTInvoice={false}
          />
        )}
      </>
    );
  }

  // Show form interface (this is what should show in edit mode)
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1300 }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6">
            {isEditMode
              ? `Edit Invoice for ${customer.name}`
              : `Generate GST/Non-GST Invoice for ${customer.name}`}
          </Typography>
        </Box>
        {isEditMode && (
          <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
            <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Editing existing invoice - modify the values below and click
            "Generate Invoices" to update
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Invoice Parameters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isEditMode
                ? "Update the date range, site, and brick quantities as needed."
                : "Select the date range and site to generate invoices based on actual sales data."}
            </Typography>

            {/* Customer GSTIN Status Display */}
            <Alert
              severity={customerGSTIN ? "success" : "warning"}
              sx={{ mb: 2 }}
              icon={loadingGSTIN ? <CircularProgress size={20} /> : undefined}
            >
              <Typography variant="body2">
                {loadingGSTIN ? (
                  "Loading customer GSTIN..."
                ) : customerGSTIN ? (
                  <>
                    <strong>Customer GSTIN:</strong> {customerGSTIN} - Will be
                    included in GST invoices
                  </>
                ) : (
                  <>
                    <strong>No GSTIN found</strong> - Customer not registered
                    for GST. GST invoices will show as unregistered customer.
                  </>
                )}
              </Typography>
            </Alert>

            {/* NEW: Disable Non-GST Invoice Option */}
            <Card variant="outlined" sx={{ mb: 2, bgcolor: "background.default" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      Invoice Generation Options
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Control how invoices are generated based on brick quantities
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={disableNonGST}
                        onChange={handleDisableNonGSTChange}
                        color="error"
                        icon={<BlockIcon />}
                        checkedIcon={<BlockIcon />}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          Generate GST Invoice Only
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Disable automatic non-GST invoice calculation
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
                {disableNonGST && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>GST Only Mode:</strong> Only GST invoices will be generated. 
                      Non-GST brick field is disabled. Specify the exact number of bricks 
                      for the GST invoice.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* NEW: Invoice Date Field */}
          <Grid item xs={12} md={4}>
            <TextField
              label="Invoice Date"
              type="date"
              fullWidth
              value={formData.invoiceDate}
              onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!validationErrors.invoiceDate}
              helperText={validationErrors.invoiceDate || "Date to be shown on the invoice"}
              InputProps={{
                startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="From Date"
              type="date"
              fullWidth
              value={formData.fromDate}
              onChange={(e) => handleInputChange("fromDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!validationErrors.fromDate}
              helperText={validationErrors.fromDate || "Sales period start date"}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="To Date"
              type="date"
              fullWidth
              value={formData.toDate}
              onChange={(e) => handleInputChange("toDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!validationErrors.toDate}
              helperText={validationErrors.toDate || "Sales period end date"}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth error={!!validationErrors.selectedSite}>
              <InputLabel>Select Site/Location</InputLabel>
              <Select
                value={formData.selectedSite}
                onChange={(e) =>
                  handleInputChange("selectedSite", e.target.value)
                }
                label="Select Site/Location"
              >
                {/* ADDED: All Sites option */}
                <MenuItem value="all">All Sites</MenuItem>
                {customerSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    {site}
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.selectedSite && (
                <Typography variant="caption" color="error">
                  {validationErrors.selectedSite}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {validationErrors.dateRange && (
            <Grid item xs={12}>
              <Alert severity="error">{validationErrors.dateRange}</Alert>
            </Grid>
          )}

          {customerSalesData.totalBricks > 0 && (
            <>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: "background.default" }}>
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ fontWeight: "bold" }}
                    >
                      Customer Purchase Summary
                      {/* ADDED: Show site selection info */}
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "normal" }}>
                        {formData.selectedSite === "all" 
                          ? `Across all sites (${customerSites.length} sites)` 
                          : `Site: ${formData.selectedSite}`}
                      </Typography>
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Total Bricks
                        </Typography>
                        <Typography variant="h6">
                          {formatQuantity(customerSalesData.totalBricks)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Total Amount
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(customerSalesData.totalAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Average Rate
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(customerSalesData.averageRate)}/brick
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="GST Invoice Bricks"
                  type="number"
                  fullWidth
                  value={formData.gstBricks}
                  onChange={(e) =>
                    handleInputChange("gstBricks", e.target.value)
                  }
                  inputProps={{ min: 0, max: customerSalesData.totalBricks }}
                  helperText={`Bricks for GST invoice (12% tax will be added)${
                    customerGSTIN ? " - GSTIN: " + customerGSTIN : " - No GSTIN"
                  }${
                    nextGstInvoiceNumber
                      ? " - Number: " + nextGstInvoiceNumber
                      : ""
                  }`}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Non-GST Invoice Bricks"
                  type="number"
                  fullWidth
                  value={formData.nonGstBricks}
                  onChange={(e) =>
                    handleInputChange("nonGstBricks", e.target.value)
                  }
                  inputProps={{ min: 0, max: customerSalesData.totalBricks }}
                  helperText="Bricks for Non-GST invoice (no tax, no GSTIN or invoice number required)"
                  // NEW: Disable field when disableNonGST is true
                  disabled={disableNonGST}
                  sx={{
                    // NEW: Visual indication when disabled
                    ...(disableNonGST && {
                      '& .MuiInputBase-root': {
                        backgroundColor: 'action.disabledBackground',
                      }
                    })
                  }}
                />
                {/* NEW: Show disabled state information */}
                {disableNonGST && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    <BlockIcon sx={{ fontSize: 12, mr: 0.5 }} />
                    Non-GST invoice generation is disabled
                  </Typography>
                )}
              </Grid>

              {validationErrors.bricks && (
                <Grid item xs={12}>
                  <Alert severity="error">{validationErrors.bricks}</Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "primary.50",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "primary.200",
                  }}
                >
                  {(parseInt(formData.gstBricks) || 0) > 0 && (
                    <Typography
                      variant="body2"
                      color="error.main"
                      sx={{ fontWeight: "bold", mt: 1 }}
                    >
                      GST Invoice Amount:{" "}
                      {formatCurrency(
                        (parseInt(formData.gstBricks) || 0) *
                          customerSalesData.averageRate *
                          1.12
                      )}{" "}
                      (with 12% GST)
                      {customerGSTIN && (
                        <span style={{ fontSize: "11px", display: "block" }}>
                          {" "}
                          - Customer GSTIN: {customerGSTIN}
                        </span>
                      )}
                    </Typography>
                  )}
                  {/* NEW: Show non-GST amount only if not disabled */}
                  {!disableNonGST && (parseInt(formData.nonGstBricks) || 0) > 0 && (
                    <Typography
                      variant="body2"
                      color="success.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      Non-GST Invoice Amount:{" "}
                      {formatCurrency(
                        (parseInt(formData.nonGstBricks) || 0) *
                          customerSalesData.averageRate
                      )}{" "}
                      (without GST)
                    </Typography>
                  )}
                  {/* NEW: Show message when non-GST is disabled */}
                  {disableNonGST && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontStyle: "italic", mt: 1 }}
                    >
                      <BlockIcon sx={{ fontSize: 14, mr: 0.5 }} />
                      Non-GST invoice generation is disabled. Only GST invoice will be generated.
                    </Typography>
                  )}
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleGenerateInvoice}
          variant="contained"
          disabled={
            !formData.fromDate ||
            !formData.toDate ||
            !formData.selectedSite ||
            !formData.invoiceDate ||
            Object.keys(validationErrors).length > 0
          }
        >
          {isEditMode ? "Update Invoice" : "Generate Invoices"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceGenerator;