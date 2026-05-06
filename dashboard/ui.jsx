// ========================================
// 共通UIコンポーネント
// ========================================

const { useState, useEffect, useMemo, useRef } = React;

// ---------- アイコン（SVG直描き、依存なし） ----------
const Icon = {
  Home: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>,
  Compare: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="10" width="7" height="10" rx="1"/><rect x="14" y="5" width="7" height="15" rx="1"/><path d="M3 4h7M14 20v-15"/></svg>,
  Story: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M14 13l3 4"/></svg>,
  Users: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="7" r="2.5"/><path d="M15 14c3 0 6 2 6 5"/></svg>,
  Sparkle: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>,
  Up: (p) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 14l5-5 5 5"/></svg>,
  Down: (p) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 10l5 5 5-5"/></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12l5 5L20 6"/></svg>,
  Clock: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  Chev: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  Plus: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  Filter: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
  Bell: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9a6 6 0 1112 0v4l1.5 3h-15L6 13z"/><path d="M10 20a2 2 0 004 0"/></svg>,
  Search: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>,
  Yen: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 4l7 9 7-9M6 13h12M6 17h12M12 13v7"/></svg>,
  Close: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  Challenge: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 20L12 4l7 16M8 14h8"/></svg>,
  Learn: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 19V6l8-3 8 3v13l-8-3z"/></svg>,
  Help: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/></svg>,
  Onone: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h10v8H7l-3 3z"/><path d="M10 14v2h7l3 3v-11h-4"/></svg>,
};

const CAT_ICON = {
  challenge: Icon.Challenge,
  learn: Icon.Learn,
  help: Icon.Help,
  onone: Icon.Onone,
};

// ---------- 基本カード ----------
function Card({ children, className = '', ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

function Delta({ value, suffix = '', inverse = false }) {
  if (value === 0 || value === undefined || value === null) {
    return <span className="delta delta-flat">—</span>;
  }
  const up = value > 0;
  const positive = inverse ? !up : up;
  return (
    <span className={`delta ${positive ? 'delta-up' : 'delta-down'}`}>
      {up ? <Icon.Up/> : <Icon.Down/>}
      {Math.abs(value)}{suffix}
    </span>
  );
}

// ---------- ポイント表記（クリックで円換算） ----------
function PointValue({ value, big = false, showYen = false }) {
  const [open, setOpen] = useState(showYen);
  useEffect(() => { setOpen(showYen); }, [showYen]);
  return (
    <button className={`point-value ${big ? 'big' : ''} ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
      <span className="pv-num">{value.toLocaleString()}</span>
      <span className="pv-unit">P</span>
      {open && <span className="pv-yen">≒ ¥{(value * 10).toLocaleString()}万</span>}
    </button>
  );
}

// ---------- セグメントコントロール ----------
function Segmented({ value, onChange, options, size = 'md' }) {
  return (
    <div className={`segmented seg-${size}`}>
      {options.map(o => (
        <button
          key={o.value}
          className={`seg-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- バッジ ----------
function Tag({ children, color = '#6366F1', subtle = true, size = 'sm' }) {
  const style = subtle ? {
    background: color + '18',
    color: color,
    borderColor: color + '30',
  } : {
    background: color,
    color: '#fff',
    borderColor: color,
  };
  return <span className={`tag tag-${size}`} style={style}>{children}</span>;
}

// ---------- アバター ----------
function Avatar({ name, size = 28, color }) {
  const initial = (name || '?').slice(0, 1);
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;
  const bg = color || `hsl(${hue}, 52%, 58%)`;
  return (
    <div className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

// ---------- プログレスリング（SVG） ----------
function Ring({ value, max, size = 56, stroke = 6, color = '#6366F1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
    </svg>
  );
}

// ---------- 簡易エリア/ラインチャート（SVG自作、依存なし） ----------
function AreaChart({ data, keys, colors, height = 200, stacked = true, showGrid = true }) {
  const width = 680;
  const padL = 36, padR = 12, padT = 12, padB = 26;
  const W = width - padL - padR;
  const H = height - padT - padB;
  // 各週の合計（stacked用）と最大値
  const totals = data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const maxV = stacked ? Math.max(...totals, 10) : Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 10);
  const niceMax = Math.ceil(maxV / 50) * 50;
  const stepX = data.length > 1 ? W / (data.length - 1) : W;

  const pointsFor = (k, i, stackBase) => {
    const v = (data[i][k] || 0) + (stacked ? stackBase : 0);
    const x = padL + stepX * i;
    const y = padT + H - (v / niceMax) * H;
    return [x, y];
  };

  const paths = [];
  const stacks = Array(data.length).fill(0);
  keys.forEach((k, ki) => {
    const color = colors[ki];
    const pts = [];
    const bases = [];
    for (let i = 0; i < data.length; i++) {
      const [x, y] = pointsFor(k, i, stacks[i]);
      pts.push([x, y]);
      bases.push([x, padT + H - (stacks[i] / niceMax) * H]);
      stacks[i] += data[i][k] || 0;
    }
    // area
    const topPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const bottomPath = bases.slice().reverse().map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    paths.push(
      <g key={k}>
        <path d={`${topPath} ${bottomPath} Z`} fill={color} opacity="0.7"/>
        <path d={topPath} fill="none" stroke={color} strokeWidth="1.5"/>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="area-chart" preserveAspectRatio="none" style={{width: '100%', height}}>
      {showGrid && [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + H - t * H;
        return (
          <g key={i}>
            <line x1={padL} x2={padL + W} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 3"/>
            <text x={padL - 8} y={y + 3} fontSize="10" textAnchor="end" fill="var(--text-3)">{Math.round(niceMax * t)}</text>
          </g>
        );
      })}
      {paths}
      {data.map((d, i) => {
        const x = padL + stepX * i;
        const show = data.length <= 14 || i % 2 === 0;
        return show && (
          <text key={i} x={x} y={padT + H + 16} fontSize="10" textAnchor="middle" fill="var(--text-3)">{d.weekLabel || d.week}</text>
        );
      })}
    </svg>
  );
}

// ---------- 横棒 ----------
function HBar({ value, max, color = '#6366F1', height = 6 }) {
  return (
    <div className="hbar" style={{ height }}>
      <div className="hbar-fill" style={{ width: `${Math.min(100, value/max*100)}%`, background: color }}/>
    </div>
  );
}

Object.assign(window, {
  Icon, CAT_ICON, Card, Delta, PointValue, Segmented, Tag, Avatar, Ring, AreaChart, HBar
});
