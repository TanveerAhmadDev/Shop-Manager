export type PaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

export interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface CustomersResponse {
  success: boolean;
  message: string;
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface InventoryItem {
  id: string;
  product_id: string;
  model_number: string;
  cost_price: number | string;
  status: string;
  product_name: string;
  brand: string | null;
  material: string | null;
  color: string | null;
  category_name: string;
}

export interface InventoryResponse {
  success: boolean;
  message: string;
  data: InventoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  total_amount: number | string;
  discount: number | string;
  tax: number | string;
  status: string;
  customer_name: string;
  phone: string | null;
  shop_name: string;
  shop_phone: string | null;
  shop_address: string | null;
  paid_amount: number | string;
  remaining_balance: number | string;
  returned_amount: number | string;
  returned_item_count: number;
  total_item_count: number;
  return_status: "none" | "partially_returned" | "fully_returned";
  returned_sale_amount: number | string;
  returned_good_cost: number | string;
  returned_discount: number | string;
}

export interface SalesResponse {
  success: boolean;
  message: string;
  data: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IndividualSaleDetailItem {
  id: string;
  type: "individual";
  inventory_item_id: string;
  model_number: string;
  product_code: null;
  product_name: string;
  quantity: 1;
  unit_sale_price: number | string;
  unit_cost_price: number | string;
}

export type SaleDetailItem = IndividualSaleDetailItem;

export interface SaleDetailsResponse {
  success: boolean;
  message: string;
  data: {
    sale: Sale & {
      customer_id: string | null;
      printing_enabled: boolean;
      notes: string | null;

      // Actual profit calculations from backend
      actual_total_cost: number | string;
      actual_gross_profit: number | string;
      actual_profit: number | string;
    };
    items: SaleDetailItem[];
    payments: {
      id: string;
      amount: number | string;
      payment_method: string;
      payment_date: string;
      reference_number: string | null;
      notes: string | null;
    }[];
  };
}

export interface NewCustomer {
  customer_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface IndividualSaleItemInput {
  model_number: string;
  quantity: number;
  unit_sale_price: number;
}

export type SaleItemInput = IndividualSaleItemInput;

export interface InitialPaymentInput {
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface CreateSaleBody {
  client_request_id?: string;
  customer_id?: string;
  customer?: NewCustomer;
  items: SaleItemInput[];
  discount?: number;
  tax?: number;
  payment?: InitialPaymentInput;
  notes?: string;
}

export type SaleReturnStatus = "pending" | "completed" | "cancelled";

export type SaleReturnType = "refund" | "exchange";

export interface SaleReturn {
  id: string;
  sale_id: string;
  return_number: string;
  return_type: SaleReturnType;
  reason: string | null;
  return_date: string;
  return_total: number | string;
  balance_adjusted_amount: number | string;
  refund_amount: number | string;
  exchange_credit_amount: number | string;
  status: SaleReturnStatus;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  item_count: number;
  model_numbers: string[];
}

export interface SaleReturnsResponse {
  success: boolean;
  data: SaleReturn[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type ReturnItemCondition = "good" | "damaged" | "needs_repair";

export interface SaleReturnDetailItem {
  id: string;
  sale_item_id: string;
  inventory_item_id: string;
  model_number: string;
  product_name: string;
  unit_sale_price: number | string;
  unit_cost_price: number | string;
  allocated_discount: number | string;
  allocated_tax: number | string;
  return_amount: number | string;
  condition: ReturnItemCondition;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  inspected_at?: string | null;
  inventory_status: string;
  product_id: string;
  original_sale_quantity: number;
}

export interface SaleReturnRefundRecord {
  id: string;
  amount: number | string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  refund_date: string;
  notes: string | null;
  created_at: string;
}

export interface SaleReturnDetailsResponse {
  success: boolean;
  data: {
    refund_preview: number | string;
    balance_adjustment_preview: number | string;
    refund_preview_can_complete: boolean;
    id: string;
    sale_id: string;
    replacement_sale_id: string | null;
    return_number: string;
    return_type: SaleReturnType;
    reason: string | null;
    return_date: string;
    return_total: number | string;
    balance_adjusted_amount: number | string;
    refund_amount: number | string;
    exchange_credit_amount: number | string;
    status: SaleReturnStatus;

    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
    } | null;

    original_sale: {
      id: string;
      sale_number: string;
      sale_date: string;
      subtotal: number | string;
      discount: number | string;
      tax: number | string;
      total_amount: number | string;
      status: string;
    };

    replacement_sale: {
      id: string;
      sale_number: string;
    } | null;

    items: SaleReturnDetailItem[];

    refunds: {
      records: SaleReturnRefundRecord[];
      total_refunded: number | string;
    };
  };
}

export interface InspectSaleReturnBody {
  items: {
    return_item_id: string;
    condition: ReturnItemCondition;
  }[];
}

export interface CompleteSaleReturnBody {
  payment_method?: PaymentMethod;
}
