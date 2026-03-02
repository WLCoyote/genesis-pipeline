const colorMap: Record<string, string> = {
  blue: "text-ds-blue",
  green: "text-ds-green",
  orange: "text-ds-orange",
  red: "text-ds-red",
  yellow: "text-ds-yellow",
  gray: "text-ds-gray",
  text: "text-ds-text dark:text-gray-100",
};

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

export default function StatCard({ label, value, subtext, color = "blue" }: StatCardProps) {
  const valueCls = colorMap[color] || color;

  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-4 py-4 shadow-ds hover:-translate-y-0.5 transition-transform">
      <div className="text-[10px] font-bold uppercase tracking-[2px] text-ds-gray dark:text-gray-400 mb-1.5">
        {label}
      </div>
      <div className={`font-display text-[32px] font-semibold leading-none ${valueCls}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-ds-gray dark:text-gray-500 mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}
