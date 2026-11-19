export type PaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

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
