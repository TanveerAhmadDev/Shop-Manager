export interface Purchase {
  id: string;
  purchase_number: string;
  purchase_date: string;
  subtotal: number | string;
  transport_cost: number | string;
  other_cost: number | string;
  total_amount: number | string;
  status: string;
  notes: string | null;

  // Multiple suppliers can belong to one purchase.
  supplier_id: string | null;
  supplier_name: string;
  supplier_count: number | string;
  suppliers: {
    id: string;
    supplier_name: string;
    phone: string | null;
  }[];

  total_quantity: number | string;
  total_lines: number | string;
}

export interface PurchasesResponse {
  success: boolean;
  message: string;
  data: Purchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PurchaseInventoryItem {
  id: string;
  purchase_item_id: string;
  model_number: string;
  cost_price: number | string;
  status: string;
  created_at: string;
}

export interface PurchaseLineItem {
  purchase_item_id: string;
  product_id: string;
  product_name: string;

  // Supplier belongs to this individual purchase line.
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;

  quantity: number | string;
  unit_purchase_price: number | string;
  allocated_extra_cost: number | string;
  landed_unit_cost: number | string;
  inventory: PurchaseInventoryItem[];
}

export interface PurchaseDetailsResponse {
  success: boolean;
  message?: string;
  data: {
    purchase: {
      id: string;
      shop_id: string;

      // Legacy header supplier; new purchases use item-level suppliers.
      supplier_id: string | null;

      purchase_number: string;
      purchase_date: string;
      printing_enabled: boolean;
      subtotal: number | string;
      transport_cost: number | string;
      other_cost: number | string;
      total_amount: number | string;
      notes: string | null;
      status: string;
      created_at: string;
      updated_at: string;

      // Aggregated supplier information.
      supplier_name: string;
      supplier_count: number | string;
      suppliers: {
        id: string;
        supplier_name: string;
        phone: string | null;
        email?: string | null;
        address?: string | null;
      }[];

      // Legacy supplier details, if returned by the backend.
      supplier_phone: string | null;
      supplier_email: string | null;
      supplier_address: string | null;
    };

    items: PurchaseLineItem[];
  };
}

export interface SupplierOption {
  id: string;
  supplier_name: string;
  phone: string | null;
}

export interface SuppliersResponse {
  success: boolean;
  message: string;
  data: SupplierOption[];
}

export interface ProductOption {
  id: string;
  product_name: string;
  category_name: string;
}

export interface ProductsResponse {
  success: boolean;
  message: string;
  data: ProductOption[];
}

export interface CreatePurchaseBody {
  purchase_date?: string;
  transport_cost: number;
  other_cost: number;
  notes?: string;

  items: {
    product_id: string;
    supplier_id: string;
    quantity: number;
    unit_purchase_price: number;
  }[];
}
