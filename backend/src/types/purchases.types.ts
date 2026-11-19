export interface PurchaseItemInput {
  product_id: string;
  supplier_id?: string | null;
  quantity: number;
  unit_purchase_price: number;
}

export interface CreatePurchaseBody {
  purchase_date?: string;
  items: PurchaseItemInput[];
  transport_cost?: number;
  other_cost?: number;
  notes?: string;
}
