import { Customer } from "@/lib/types";

interface CustomerInfoProps {
  customer: Customer;
}

export default function CustomerInfo({ customer }: CustomerInfoProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Customer
      </h2>
      <div className="space-y-2">
        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {customer.name}
        </div>

        {customer.phone && (
          <div className="flex items-center justify-between">
            <a
              href={`tel:${customer.phone}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {customer.phone}
            </a>
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Call Now
            </a>
          </div>
        )}

        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="block text-sm text-blue-600 hover:underline"
          >
            {customer.email}
          </a>
        )}

        {customer.address && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{customer.address}</div>
        )}

        {customer.equipment_type && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-600 dark:text-gray-400">Equipment:</span>{" "}
            {customer.equipment_type}
          </div>
        )}
      </div>
    </div>
  );
}
