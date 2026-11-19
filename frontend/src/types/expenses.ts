export type ExpenseType = "business" | "personal";

export type PaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

export interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number | string;
  expense_type: "business" | "personal";
  expense_date: string;
  payment_method: string;
  reference_number: string | null;
  category_id: string | null;
  category_name: string | null;
  created_at: string;
  created_by_name?: string | null;
}

export interface ExpensesResponse {
  success: boolean;
  message: string;
  data: Expense[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExpenseSummary {
  total_sales: number | string;
  total_sales_count: number;

  total_received: number | string;
  total_payment_count: number;

  outstanding_balance: number | string;

  business_expenses: number | string;
  personal_withdrawals: number | string;
  total_spending: number | string;

  cash_after_spending: number | string;

  total_expense_count: number;
  business_expense_count: number;
  personal_expense_count: number;
}

export interface ExpenseSummaryResponse {
  success: boolean;
  message: string;
  data: ExpenseSummary;
}
