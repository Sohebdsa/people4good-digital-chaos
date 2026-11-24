export function Radar({ data, size = 320 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const n = data.length;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v];
  };
  const poly = data.map((d, i) => pt(i, Math.max(0.02, d.value / 100)).join(',')).join(' ');
  return (
    <svg viewBox={`-70 0 ${size + 140} ${size}`} width="100%" style={{ maxWidth: size + 140 }} role="img" aria-label="Digital maturity radar chart">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={data.map((_, i) => pt(i, k).join(',')).join(' ')}
          fill={k === 1 ? '#fff6e5' : 'none'}
          stroke="#d9ccb2"
          strokeWidth={k === 1 ? 2 : 1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#d9ccb2" />;
      })}
      <polygon points={poly} fill="rgba(31,181,168,0.32)" stroke="#13877d" strokeWidth={3} strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(0.02, d.value / 100));
        return <circle key={i} cx={x} cy={y} r={5} fill={d.color} stroke="#14213d" strokeWidth={2} />;
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.22);
        const anchor = Math.abs(x - cx) < 10 ? 'middle' : x > cx ? 'start' : 'end';
        const words = d.label.split(' ');
        const mid = Math.ceil(words.length / 2);
        const lines = words.length > 2 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [d.label];
        return (
          <text key={i} x={x} y={y - (lines.length - 1) * 7} textAnchor={anchor} fontSize={12} fontWeight={700} fill="#14213d" fontFamily="Inter, sans-serif">
            {lines.map((ln, k) => (
              <tspan key={k} x={x} dy={k === 0 ? 0 : 14}>{ln}</tspan>
            ))}
            <tspan x={x} dy={14} fill="#5b6478" fontWeight={600}>{d.value}%</tspan>
          </text>
        );
      })}
    </svg>
  );
}

export function ScoreRing({ value, size = 170 }: { value: number; size?: number }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="#fff6e5" stroke="#e8dcc4" strokeWidth={14} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1fb5a8" strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="center">
        <div><b>{value}</b><span className="muted" style={{ fontSize: 13 }}>out of 100</span></div>
      </div>
    </div>
  );
}
