"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import {
  Download,
  FileSpreadsheet,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

import { apiRequest } from "@/lib/api";

interface CSVRow {
  product_name: string;
  supplier_name: string;
  quantity: string;
  unit_purchase_price: string;
}

interface PreviewRow extends CSVRow {
  rowNumber: number;
  errors: string[];
  product_id: string;
  supplier_id: string;
}

interface ProductOption {
  id: string;
  product_name: string;
  category_name: string;
}

interface SupplierOption {
  id: string;
  supplier_name: string;
  phone: string | null;
}

interface ProductsResponse {
  success: boolean;
  data: ProductOption[];
}

interface SuppliersResponse {
  success: boolean;
  data: SupplierOption[];
}

interface CreatePurchaseBody {
  purchase_date: string;
  transport_cost: number;
  other_cost: number;
  notes: string;
  items: {
    product_id: string;
    supplier_id: string;
    quantity: number;
    unit_purchase_price: number;
  }[];
}

interface PurchaseResponse {
  success: boolean;
  data: {
    purchase_number: string;
  };
}

const REQUIRED_HEADERS = [
  "product_name",
  "supplier_name",
  "quantity",
  "unit_purchase_price",
];

const templateCSV = [
  "product_name,supplier_name,quantity,unit_purchase_price",
  "Sofa,Supplier A,1,25000",
  "Office Chair,Supplier B,10,5000",
  "Dining Table,Supplier A,2,18000",
].join("\n");

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function CsvPurchaseImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const queryClient = useQueryClient();

  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });

  const [transportCost, setTransportCost] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [completedPurchase, setCompletedPurchase] = useState("");

  const createPurchaseMutation = useMutation({
    mutationFn: (body: CreatePurchaseBody) =>
      apiRequest<PurchaseResponse>("/purchases", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
      ]);

      setCompletedPurchase(result.data.purchase_number);

      toast.add({
        title: "Purchase created successfully",
        description: `${result.data.purchase_number} has been recorded and inventory has been added.`,
        type: "success",
      });
    },

    onError: (err) => {
      toast.add({
        title: "Purchase creation failed",
        description:
          err instanceof Error ? err.message : "Unable to create purchase.",
        type: "error",
      });
    },
  });

  // Load existing products and suppliers.
  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        setOptionsError("");

        const [supplierResult, productResult] = await Promise.all([
          apiRequest<SuppliersResponse>("/suppliers?limit=100"),
          apiRequest<ProductsResponse>("/products?limit=100"),
        ]);

        setSuppliers(supplierResult.data);
        setProducts(productResult.data);
      } catch (err) {
        setOptionsError(
          err instanceof Error
            ? err.message
            : "Unable to load products and suppliers.",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  // Automatically match CSV names with existing records.
  useEffect(() => {
    if (isLoadingOptions || rows.length === 0) return;

    setRows((currentRows) =>
      currentRows.map((row) => {
        let productId = row.product_id;
        let supplierId = row.supplier_id;

        // Match product only when it has not already been selected.
        if (!productId && row.product_name.trim()) {
          const matches = products.filter(
            (product) =>
              normalizeName(product.product_name) ===
              normalizeName(row.product_name),
          );

          // Only automatically select unique matches.
          if (matches.length === 1) {
            productId = matches[0].id;
          }
        }

        // Match supplier only when it has not already been selected.
        if (!supplierId && row.supplier_name.trim()) {
          const matches = suppliers.filter(
            (supplier) =>
              normalizeName(supplier.supplier_name) ===
              normalizeName(row.supplier_name),
          );

          if (matches.length === 1) {
            supplierId = matches[0].id;
          }
        }

        if (productId === row.product_id && supplierId === row.supplier_id) {
          return row;
        }

        return {
          ...row,
          product_id: productId,
          supplier_id: supplierId,
        };
      }),
    );
  }, [products, suppliers, isLoadingOptions, rows.length]);

  // Download the sample CSV template.
  function downloadTemplate() {
    const blob = new Blob([templateCSV], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "furniture-purchase-template.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Validate each CSV row.
  function validateRow(row: CSVRow): string[] {
    const errors: string[] = [];

    if (!row.product_name?.trim()) {
      errors.push("Product name is required");
    }

    if (!row.supplier_name?.trim()) {
      errors.push("Supplier name is required");
    }

    const quantity = Number(row.quantity);

    if (
      !row.quantity?.trim() ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 1000
    ) {
      errors.push("Quantity must be between 1 and 1000");
    }

    const price = Number(row.unit_purchase_price);

    if (
      !row.unit_purchase_price?.trim() ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      errors.push("Purchase price must be greater than zero");
    }

    return errors;
  }

  // Read and parse the selected CSV file.
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setRows([]);
    setFileName("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim().toLowerCase(),

      complete: (result) => {
        setIsParsing(false);

        const headers = result.meta.fields ?? [];

        const missingHeaders = REQUIRED_HEADERS.filter(
          (header) => !headers.includes(header),
        );

        if (missingHeaders.length > 0) {
          setError(`Missing CSV columns: ${missingHeaders.join(", ")}`);
          setFileName("");
          return;
        }

        if (result.errors.length > 0) {
          setError(`Unable to read CSV correctly: ${result.errors[0].message}`);
          setFileName("");
          return;
        }

        if (result.data.length === 0) {
          setError("The CSV file does not contain any purchase items.");
          setFileName("");
          return;
        }

        if (result.data.length > 1000) {
          setError("You can import a maximum of 1000 purchase rows at once.");
          setFileName("");
          return;
        }

        const previewRows: PreviewRow[] = result.data.map((row, index) => {
          const csvRow: CSVRow = {
            product_name: row.product_name?.trim() ?? "",
            supplier_name: row.supplier_name?.trim() ?? "",
            quantity: row.quantity?.trim() ?? "",
            unit_purchase_price: row.unit_purchase_price?.trim() ?? "",
          };

          return {
            ...csvRow,
            rowNumber: index + 2,
            errors: validateRow(csvRow),
            product_id: "",
            supplier_id: "",
          };
        });

        setRows(previewRows);
      },

      error: () => {
        setIsParsing(false);
        setFileName("");
        setError("Unable to read the selected CSV file.");
      },
    });
  }

  // Manually select a product or supplier for a row.
  function updateRowMatch(
    rowNumber: number,
    field: "product_id" | "supplier_id",
    value: string,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.rowNumber === rowNumber ? { ...row, [field]: value } : row,
      ),
    );
  }

  // Reset the importer.
  function clearFile() {
    setRows([]);
    setFileName("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.length - validRows.length;

  const matchedRows = rows.filter((row) => row.product_id && row.supplier_id);

  const unmatchedRows = rows.length - matchedRows.length;

  const readyRows = rows.filter(
    (row) => row.errors.length === 0 && row.product_id && row.supplier_id,
  );

  function handleCreatePurchase() {
    if (readyRows.length !== rows.length || rows.length === 0) {
      toast.add({
        title: "Purchase cannot be created",
        description: "Please resolve all CSV validation and matching issues.",
        type: "error",
      });
      return;
    }

    const transport = Number(transportCost);
    const other = Number(otherCost);

    if (!Number.isFinite(transport) || transport < 0) {
      toast.add({
        title: "Invalid transport cost",
        description: "Enter a valid transport cost.",
        type: "error",
      });
      return;
    }

    if (!Number.isFinite(other) || other < 0) {
      toast.add({
        title: "Invalid other cost",
        description: "Enter a valid other cost.",
        type: "error",
      });
      return;
    }

    if (!purchaseDate) {
      toast.add({
        title: "Purchase date required",
        description: "Please select a purchase date.",
        type: "error",
      });
      return;
    }

    const body: CreatePurchaseBody = {
      purchase_date: purchaseDate,
      transport_cost: transport,
      other_cost: other,
      notes: purchaseNotes.trim(),
      items: readyRows.map((row) => ({
        product_id: row.product_id,
        supplier_id: row.supplier_id,
        quantity: Number(row.quantity),
        unit_purchase_price: Number(row.unit_purchase_price),
      })),
    };

    createPurchaseMutation.mutate(body);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Import Purchase from CSV
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Upload your purchase spreadsheet and match its items with your
          existing products and suppliers.
        </p>
      </div>

      {/* Download Template */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet size={23} />
            </div>

            <div>
              <h2 className="font-semibold text-foreground">
                Download CSV Template
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Use our template to organize your products, suppliers,
                quantities and purchase prices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            <Download size={17} />
            Download Template
          </button>
        </div>
      </section>

      {/* CSV Upload */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Upload Purchase CSV</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Select your completed CSV file. Maximum file size: 5 MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {!fileName ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="mt-5 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-5 py-10 text-center transition hover:border-primary hover:bg-accent/30 disabled:opacity-50"
          >
            <Upload size={30} className="mb-3 text-primary" />

            <span className="font-semibold text-foreground">
              {isParsing ? "Reading CSV..." : "Choose CSV File"}
            </span>

            <span className="mt-1 text-xs text-muted-foreground">
              CSV files only
            </span>
          </button>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet size={22} className="shrink-0 text-primary" />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {fileName}
                </p>

                <p className="text-xs text-muted-foreground">
                  {rows.length} purchase rows imported
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition hover:bg-accent"
            >
              <X size={16} />
              Remove File
            </button>
          </div>
        )}
      </section>

      {/* Errors */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {optionsError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          Unable to load matching records: {optionsError}
        </div>
      )}

      {/* Loading records */}
      {rows.length > 0 && isLoadingOptions && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 size={17} className="animate-spin" />
          Loading your existing products and suppliers...
        </div>
      )}

      {/* Summary */}
      {rows.length > 0 && !isLoadingOptions && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Rows</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {rows.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Valid CSV Rows</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {validRows.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Matched Rows</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {matchedRows.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Unmatched Rows</p>
            <p className="mt-1 text-xl font-bold text-amber-600">
              {unmatchedRows}
            </p>
          </div>
        </div>
      )}

      {/* Preview and Matching */}
      {rows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold text-foreground">
                Imported Purchase Items
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Match each CSV product and supplier with your existing records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-green-600 dark:text-green-400">
                {readyRows.length} Ready
              </span>

              <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-destructive">
                {invalidRows} Invalid
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Match Product</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Match Supplier</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const productMatched = Boolean(row.product_id);
                  const supplierMatched = Boolean(row.supplier_id);

                  return (
                    <tr key={row.rowNumber}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.rowNumber}
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.product_name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={row.product_id}
                          onChange={(event) =>
                            updateRowMatch(
                              row.rowNumber,
                              "product_id",
                              event.target.value,
                            )
                          }
                          className="w-52 rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Select product</option>

                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.product_name}
                              {product.category_name
                                ? ` (${product.category_name})`
                                : ""}
                            </option>
                          ))}
                        </select>

                        {productMatched && (
                          <p className="mt-1 text-xs text-green-600">Matched</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-foreground">
                        {row.supplier_name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={row.supplier_id}
                          onChange={(event) =>
                            updateRowMatch(
                              row.rowNumber,
                              "supplier_id",
                              event.target.value,
                            )
                          }
                          className="w-52 rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Select supplier</option>

                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.supplier_name}
                            </option>
                          ))}
                        </select>

                        {supplierMatched && (
                          <p className="mt-1 text-xs text-green-600">Matched</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-foreground">
                        {row.quantity || "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-foreground">
                        {row.unit_purchase_price || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {row.errors.length > 0 ? (
                          <div className="max-w-64 space-y-1 text-xs text-destructive">
                            {row.errors.map((message) => (
                              <p key={message}>• {message}</p>
                            ))}
                          </div>
                        ) : productMatched && supplierMatched ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 size={15} />
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-600">
                            Needs matching
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {readyRows.length === rows.length ? (
                <span className="font-medium text-green-600">
                  All rows are valid and matched. They are ready for the next
                  step.
                </span>
              ) : (
                <>
                  {unmatchedRows > 0 &&
                    `${unmatchedRows} row(s) still need product or supplier matching. `}
                  {invalidRows > 0 &&
                    `${invalidRows} row(s) have validation errors. `}
                  Resolve these issues before creating the purchase.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-semibold text-foreground">Purchase Details</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the additional information for this purchase.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Purchase Date
              </label>

              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Transport Cost
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Other Cost
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCost}
                onChange={(e) => setOtherCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Total CSV Items
              </label>

              <div className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground">
                {readyRows.length} items ready
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Purchase Notes (Optional)
            </label>

            <textarea
              value={purchaseNotes}
              onChange={(e) => setPurchaseNotes(e.target.value)}
              rows={3}
              placeholder="Enter purchase notes..."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleCreatePurchase}
            disabled={
              isLoadingOptions ||
              readyRows.length !== rows.length ||
              rows.length === 0 ||
              createPurchaseMutation.isPending ||
              Boolean(completedPurchase)
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createPurchaseMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Purchase...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Create Purchase
              </>
            )}
          </button>

          {readyRows.length !== rows.length && (
            <p className="text-center text-xs text-amber-600">
              Match all products and suppliers and fix validation errors before
              creating the purchase.
            </p>
          )}
        </section>
      )}

      {completedPurchase && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-green-600" size={24} />

            <div>
              <h2 className="font-semibold text-green-700 dark:text-green-400">
                Purchase Created Successfully!
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Purchase number:{" "}
                <strong className="text-foreground">{completedPurchase}</strong>
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Your inventory has been updated successfully.
              </p>

              <button
                type="button"
                onClick={() => {
                  clearFile();
                  setCompletedPurchase("");
                  setPurchaseNotes("");
                  setTransportCost("0");
                  setOtherCost("0");
                }}
                className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Import Another Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
