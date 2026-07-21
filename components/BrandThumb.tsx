export default function BrandThumb({
  name,
  className = "",
  textClassName = "text-xl",
  initialOnly = false,
}: {
  name: string;
  className?: string;
  textClassName?: string;
  initialOnly?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden border border-gray-100 bg-white ${className}`}
      aria-hidden
    >
      <span
        className={`whitespace-nowrap font-extrabold tracking-tight text-gray-900 ${textClassName}`}
      >
        {initialOnly ? name.slice(0, 1) : name}
      </span>
    </div>
  );
}
