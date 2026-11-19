"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  total_purchases: number;
  total_spent: string;
  total_paid: string;
  outstanding_balance: string;
}

interface Purchase {
  sale_id: string;
  sale_number: string;
  sale_date: string;
  subtotal: string;
  discount: string;
  tax: string;
  total_amount: string;
  status: string;
  total_paid: string;
  outstanding_balance: string;
}

interface CustomerResponse {
  success: boolean;
  data: Customer;
}

interface PurchasesResponse {
  success: boolean;
  data: {
    customer: {
      id: string;
      customer_name: string;
    };
    purchases: Purchase[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

type PaymentMethod = "cash" | "bank" | "easypaisa" | "jazzcash" | "other";

interface AddPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: {
      id: string;
      amount: string;
      payment_method: PaymentMethod;
      payment_date: string;
      reference_number: string | null;
      notes: string | null;
    };
    total_amount: string;
    paid_amount: string;
    remaining_balance: string;
  };
}

const money = (value: string | number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function CustomerDetailsPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSale, setSelectedSale] = useState<Purchase | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const handleReceivePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSale) return;

    const amount = Number(paymentAmount);
    const remaining = Number(selectedSale.outstanding_balance);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    if (amount > remaining) {
      setPaymentError(
        `Payment cannot exceed Rs. ${remaining.toLocaleString("en-PK")}.`,
      );
      return;
    }

    try {
      setSavingPayment(true);
      setPaymentError("");
      setPaymentSuccess("");

      const response = await apiRequest<AddPaymentResponse>(
        `/sales/${selectedSale.sale_id}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || null,
            notes: paymentNotes.trim() || null,
          }),
        },
      );

      const { paid_amount, remaining_balance } = response.data;

      // Update the selected bill in the purchase ledger.
      setPurchases((previous) =>
        previous.map((purchase) =>
          purchase.sale_id === selectedSale.sale_id
            ? {
                ...purchase,
                total_paid: paid_amount,
                outstanding_balance: remaining_balance,
              }
            : purchase,
        ),
      );

      // Update the customer's account summary.
      setCustomer((previous) =>
        previous
          ? {
              ...previous,
              total_paid: (Number(previous.total_paid) + amount).toFixed(2),
              outstanding_balance: (
                Number(previous.outstanding_balance) - amount
              ).toFixed(2),
            }
          : previous,
      );

      setPaymentSuccess(`Payment of ${money(amount)} received successfully.`);

      // Close and reset the form.
      setSelectedSale(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setReferenceNumber("");
      setPaymentNotes("");
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Failed to record payment.",
      );
    } finally {
      setSavingPayment(false);
    }
  };

  useEffect(() => {
    const loadCustomerDetails = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch customer information and purchase history together.
        const [customerResponse, purchasesResponse] = await Promise.all([
          apiRequest<CustomerResponse>(`/customers/${customerId}`),
          apiRequest<PurchasesResponse>(
            `/customers/${customerId}/purchases?limit=100&page=1`,
          ),
        ]);

        console.log(customerResponse.data);

        setCustomer(customerResponse.data);
        setPurchases(purchasesResponse.data.purchases);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customer details.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      loadCustomerDetails();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading customer details...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{error || "Customer not found."}</p>

        <Link
          href="/customers"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>
      </div>
    );
  }

  const outstanding = Number(customer.outstanding_balance || 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/customers"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to customers
          </Link>

          <h1 className="text-2xl font-bold">Customer Details</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            View customer information and account history.
          </p>
        </div>

        <Link
          href={`/customers/${customer.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Edit size={16} />
          Edit Customer
        </Link>
      </div>

      {/* Customer information */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User size={26} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{customer.customer_name}</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">
                {customer.phone || "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail size={18} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">
                {customer.email || "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium">
                {customer.address || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="mt-1 text-sm">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Purchases"
          value={String(customer.total_purchases)}
          icon={<ShoppingBag size={20} />}
        />

        <SummaryCard
          title="Total Amount"
          value={money(customer.total_spent)}
          icon={<FileText size={20} />}
        />

        <SummaryCard
          title="Total Received"
          value={money(customer.total_paid)}
          icon={<CreditCard size={20} />}
        />

        <SummaryCard
          title="Outstanding Balance"
          value={money(customer.outstanding_balance)}
          icon={<CreditCard size={20} />}
          danger={outstanding > 0}
        />
      </div>

      {/* Payment success message */}
      {paymentSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {paymentSuccess}
        </div>
      )}

      {/* Receive Payment Form */}
      {selectedSale && (
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Receive Payment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recording payment for {selectedSale.sale_number}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSale(null);
                setPaymentError("");
              }}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>

          <div className="mb-5 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Remaining balance</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {money(selectedSale.outstanding_balance)}
            </p>
          </div>

          <form onSubmit={handleReceivePayment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={selectedSale.outstanding_balance}
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  placeholder="Transaction ID (optional)"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional payment notes..."
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {paymentError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPayment}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {savingPayment ? "Recording Payment..." : "Record Payment"}
            </button>
          </form>
        </div>
      )}

      {/* Purchase ledger */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-semibold">Purchase Ledger</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All bills and their payment status.
            </p>
          </div>

          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {purchases.length} bills loaded
          </span>
        </div>

        {purchases.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag size={30} className="mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">No purchases yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Purchases made by this customer will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Bill Number</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {purchases.map((purchase) => {
                  const due = Number(purchase.outstanding_balance);

                  return (
                    <tr key={purchase.sale_id}>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {purchase.sale_number}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDate(purchase.sale_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {money(purchase.total_amount)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-green-600">
                        {money(purchase.total_paid)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium">
                        <span
                          className={
                            due > 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          {money(purchase.outstanding_balance)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            due > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {due > 0 ? "Partially Paid" : "Paid"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/sales/${purchase.sale_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            View Bill
                          </Link>

                          {Number(purchase.outstanding_balance) > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSale(purchase);
                                setPaymentAmount("");
                                setPaymentMethod("cash");
                                setReferenceNumber("");
                                setPaymentNotes("");
                                setPaymentError("");
                                setPaymentSuccess("");
                              }}
                              className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              Receive Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment history will be connected to a dedicated API next. */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <CalendarDays size={19} />
          <h2 className="font-semibold">Payment History</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Total payments received: {money(customer.total_paid)}. Individual
          payment dates, methods and amounts will appear here after we add the
          customer payment-history API.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className={danger ? "text-red-500" : "text-muted-foreground"}>
          {icon}
        </span>
      </div>

      <p className={`mt-3 text-xl font-bold ${danger ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
