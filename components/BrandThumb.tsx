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
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(250,112,53,.12), rgba(255,0,153,.12))",
      }}
      aria-hidden
    >
      <span
        className={`whitespace-nowrap font-extrabold tracking-tight text-[#b81f6c] ${textClassName}`}
      >
        {initialOnly ? name.slice(0, 1) : name}
      </span>
    </div>
  );
}
