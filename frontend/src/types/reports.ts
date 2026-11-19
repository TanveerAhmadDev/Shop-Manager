export interface ProfitReport {
  start_date: string;
  end_date: string;

  total_sales_count: number;
  sales_revenue: number | string;
  tax_collected: number | string;
  total_billed_amount: number | string;

  items_sold: number;
  cost_of_goods_sold: number | string;

  gross_profit: number | string;

  business_expenses: number | string;
  personal_withdrawals: number | string;

  net_operating_profit: number | string;
  profit_margin: number | string;

  business_expense_count: number;
  personal_expense_count: number;
  total_expense_count: number;
}

export interface ProfitReportResponse {
  success: boolean;
  message: string;
  data: ProfitReport;
}
