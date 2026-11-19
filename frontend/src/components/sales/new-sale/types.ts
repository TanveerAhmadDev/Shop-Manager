import type { Customer, InventoryItem } from "@/types/sales";

export type PaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

export interface IndividualBillItem {
  type: "individual";
  inventory: InventoryItem;
  quantity: number;
  price: string;
}

export type BillItem = IndividualBillItem;

export interface NewSaleCustomerProps {
  isUrdu: boolean;
  customers: Customer[];

  customerMode: "existing" | "new";
  setCustomerMode: (mode: "existing" | "new") => void;

  customerId: string;
  setCustomerId: (id: string) => void;

  customerName: string;
  setCustomerName: (name: string) => void;

  customerPhone: string;
  setCustomerPhone: (phone: string) => void;

  customerEmail: string;
  setCustomerEmail: (email: string) => void;

  customerAddress: string;
  setCustomerAddress: (address: string) => void;
}

export interface FurnitureScanMessage {
  type: "success" | "error" | "warning";
  text: string;
}

export interface NewSaleFurnitureProps {
  isUrdu: boolean;

  items: BillItem[];
  showCostDetails: boolean;
  revealCostDetails: () => void;

  scannerOpen: boolean;
  setScannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unlockAudio: () => void | Promise<void>;

  scanMessage: FurnitureScanMessage | null;
  setScanMessage: (message: FurnitureScanMessage | null) => void;

  modelNumber: string;
  setModelNumber: (value: string) => void;

  quantity: number;
  setQuantity: (value: number) => void;

  modelSuggestions: InventoryItem[];

  addItem: () => void;
  addInventoryToBill: (item: InventoryItem) => boolean;
  removeItem: (inventoryId: string) => void;
  updateItemPrice: (inventoryId: string, price: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;

  setError: (error: string) => void;
  formatMoney: (amount: number) => string;

  errors: {
    modelNumber?: boolean;
    itemPrices?: string[];
  };

  clearItemPriceError: (inventoryId: string) => void;
}

export interface NewSalePaymentProps {
  isUrdu: boolean;

  discount: string;
  setDiscount: (value: string) => void;

  tax: string;
  setTax: (value: string) => void;

  subtotal: number;
  discountValue: number;
  taxValue: number;
  total: number;

  showCostDetails: boolean;
  totalLandedCost: number;
  expectedProfit: number;

  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  isPaymentInvalid: boolean;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;

  paymentMethods: {
    value: PaymentMethod;
    label: string;
  }[];

  referenceNumber: string;
  setReferenceNumber: (value: string) => void;

  paid: number;
  balance: number;

  formatMoney: (amount: number) => string;
}

export interface NewSaleActionsProps {
  isUrdu: boolean;
  submitting: boolean;
  itemsCount: number;
  isPaymentInvalid: boolean;
  total: number;
  formatMoney: (amount: number) => string;
}

export interface NewSaleFieldErrors {
  itemPrices: string[];
  customerId?: boolean;
  customerName?: boolean;
  discount?: boolean;
  paymentAmount?: boolean;
}
