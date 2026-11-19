export type ProductTrackingType = "individual" | "bulk";

export interface Product {
  id: string;
  product_name: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  color: string | null;

  // How this product's stock is tracked.
  tracking_type: ProductTrackingType;

  // Barcode/product code used to identify bulk products.
  product_code: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductsResponse {
  success: boolean;
  message: string;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductDetailsResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface CategoriesResponse {
  success: boolean;
  message: string;
  data: Category[];
}

export interface ProductFormData {
  product_name: string;
  category_id: string | null;
  description: string;
  brand: string;
  material: string;
  color: string;

  tracking_type: ProductTrackingType;
  product_code: string;
}
