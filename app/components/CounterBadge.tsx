interface CounterBadgeProps {
  icon: string;
  count: number;
  title: string;
}

export default function CounterBadge({ icon, count, title }: CounterBadgeProps) {
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400"
      title={title}
    >
      <span>{icon}</span>
      <span>{count}</span>
    </span>
  );
}
