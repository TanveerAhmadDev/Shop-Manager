export type ExpenseType = "business" | "personal";

export type PaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

export interface CreateExpenseBody {
  category_id?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  expense_type: ExpenseType;
  expense_date?: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
}

export interface UpdateExpenseBody {
  category_id?: string | null;
  title?: string;
  description?: string | null;
  amount?: number;
  expense_type?: ExpenseType;
  expense_date?: string;
  payment_method?: PaymentMethod;
  reference_number?: string | null;
}

export interface CreateExpenseCategoryBody {
  category_name: string;
  expense_type: ExpenseType;
}
