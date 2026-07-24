export function Sparkline({
  data,
  color = "var(--accent)",
  className = "",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <svg
        viewBox="0 0 80 28"
        className={`h-7 w-20 ${className}`}
        aria-hidden
      >
        <line
          x1="4"
          y1="14"
          x2="76"
          y2="14"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.35"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-20 ${className}`} aria-hidden>
      <polygon points={area} fill={color} fillOpacity="0.12" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
