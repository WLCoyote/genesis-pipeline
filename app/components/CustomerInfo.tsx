import { Customer } from "@/lib/types";

interface CustomerInfoProps {
  customer: Customer;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function CustomerInfo({ customer }: CustomerInfoProps) {
  const initials = getInitials(customer.name || "?");

  return (
    <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4">
      <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400 mb-3">
        Customer
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#1565c0] to-[#1e88e5] flex items-center justify-center text-[15px] font-black text-white shrink-0">
          {initials}
        </div>
        <div>
          <div className="text-[15px] font-bold text-ds-text dark:text-gray-100">
            {customer.name}
          </div>
          {customer.hcp_customer_id && (
            <div className="text-[11px] text-ds-gray-lt dark:text-gray-500">
              #{customer.hcp_customer_id}
            </div>
          )}
        </div>
      </div>

      {/* Contact rows */}
      <div className="space-y-0">
        {customer.phone && (
          <div className="flex items-center justify-between py-[7px] border-b border-ds-border/50 dark:border-gray-700/50">
            <a
              href={`tel:${customer.phone}`}
              className="text-[13px] text-ds-blue font-bold hover:underline"
            >
              {customer.phone}
            </a>
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ds-green text-white text-[12px] font-bold rounded-[7px] hover:brightness-110 transition-all no-underline"
            >
              Call Now
            </a>
          </div>
        )}

        {customer.email && (
          <div className="py-[7px] border-b border-ds-border/50 dark:border-gray-700/50">
            <a
              href={`mailto:${customer.email}`}
              className="text-[13px] text-ds-blue font-bold hover:underline"
            >
              {customer.email}
            </a>
          </div>
        )}

        {customer.address && (
          <div className="py-[7px] text-[13px] text-ds-text-lt dark:text-gray-400">
            {customer.address}
          </div>
        )}

        {customer.equipment_type && (
          <div className="py-[7px] text-[13px] text-ds-text-lt dark:text-gray-400">
            <span className="font-bold text-ds-text dark:text-gray-300">Equipment:</span>{" "}
            {customer.equipment_type}
          </div>
        )}
      </div>
    </div>
  );
}
