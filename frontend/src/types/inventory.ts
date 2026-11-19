export type InventoryStatus =
  | "in_stock"
  | "sold"
  | "damaged"
  | "returned"
  | "cancelled";

export interface InventoryDetails {
  id: string;
  model_number: string;
  cost_price: string;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;

  product_id: string;
  product_name: string;
  product_description: string | null;
  brand: string | null;
  material: string | null;
  color: string | null;

  category_id: string | null;
  category_name: string | null;

  purchase_id: string | null;
  purchase_number: string | null;
  purchase_date: string | null;
  purchase_status: string | null;

  purchase_quantity: number | null;
  unit_purchase_price: string | null;
  allocated_extra_cost: string | null;

  supplier_id: string | null;
  supplier_name: string | null;
}

export interface InventoryDetailsResponse {
  success: boolean;
  message: string;
  data: InventoryDetails;
}

export interface InventoryAdjustment {
  adjustment_id: string;
  previous_status: InventoryStatus;
  new_status: InventoryStatus;
  reason: string;
  notes: string | null;
  created_at: string;
  adjusted_by_id: string | null;
  adjusted_by_name: string | null;
}

export interface InventoryAdjustmentsResponse {
  success: boolean;
  message: string;
  data: {
    inventory: {
      id: string;
      model_number: string;
    };
    adjustments: InventoryAdjustment[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface UpdateInventoryStatusResponse {
  success: boolean;
  message: string;
  data: {
    inventory_id: string;
    model_number: string;
    previous_status: InventoryStatus;
    new_status: InventoryStatus;
    adjustment_id: string;
    adjusted_at: string;
  };
}

// Individual inventory item shown in the inventory list.
export interface InventoryItem {
  id: string;
  model_number: string;
  cost_price: string;
  status: InventoryStatus;
  created_at: string;

  product_id: string;
  product_name: string;
  brand: string | null;
  material: string | null;
  color: string | null;

  category_id: string | null;
  category_name: string | null;
}

// Response returned by GET /inventory.
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
