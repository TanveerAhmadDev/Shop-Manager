import Link from "next/link";

interface SaleErrorProps {
  error: string;
  isUrdu: boolean;
  onRetry: () => void;
}

const SaleError = ({ error, isUrdu, onRetry }: SaleErrorProps) => {
  return (
    <div dir={isUrdu ? "rtl" : "ltr"} className="space-y-4">
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {error || (isUrdu ? "فروخت نہیں ملی۔" : "Sale not found.")}
      </p>

      <button
        onClick={onRetry}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        {isUrdu ? "دوبارہ کوشش کریں" : "Try again"}
      </button>

      <div>
        <Link href="/sales" className="text-sm underline">
          {isUrdu ? "فروخت پر واپس جائیں" : "Back to sales"}
        </Link>
      </div>
    </div>
  );
};

export default SaleError;
