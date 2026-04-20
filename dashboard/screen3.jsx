// ========================================
// 画面3: 因果フローマップ
// ========================================

const CAUSAL_CONNECTIONS = [
  { from: 'activeRate', to: 'eng',       layer: 'LI', strength: 'strong' },
  { from: 'ononeRate',  to: 'eng',       layer: 'LI', strength: 'strong' },
  { from: 'ononeRate',  to: 'retention', layer: 'LI', strength: 'medium' },
  { from: 'challenges', to: 'skill',     layer: 'LI', strength: 'strong' },
  { from: 'challenges', to: 'eng',       layer: 'LI', strength: 'weak'   },
  { from: 'helps',      to: 'eng',       layer: 'LI', strength: 'medium' },
  { from: 'helps',      to: 'skill',     layer: 'LI', strength: 'medium' },
  { from: 'eng',        to: 'profit',    layer: 'IL', strength: 'strong' },
  { from: 'eng',        to: 'sales',     layer: 'IL', strength: 'medium' },
  { from: 'eng',        to: 'per',       layer: 'IL', strength: 'medium' },
  { from: 'retention',  to: 'profit',    layer: 'IL', strength: 'strong' },
  { from: 'retention',  to: 'sales',     layer: 'IL', strength: 'strong' },
  { from: 'skill',      to: 'profit',    layer: 'IL', strength: 'weak'   },
];

function CausalView({ allData }) {
  const DEPTS = window.__DASH.DEPARTMENTS;
  const BASE = { activeRate: 54, ononeRate: 68, challenges: 120, helps: 37 };

  const [vals, setVals]         = useState({ ...BASE });
  const [selected, setSelected] = useState(null);
  const [svgPaths, setSvgPaths] = useState([]);
  const [svgDims,  setSvgDims]  = useState({ w: 0, h: 0 });

  const mapRef  = useRef(null);
  const cRefs   = useRef({});
  const rafRef  = useRef(null);

  const set = (k, v, lo, hi) => setVals(p => ({ ...p, [k]: Math.min(hi, Math.max(lo, v)) }));
  const toggle = (key) => setSelected(p => p === key ? null : key);
  const r = id => el => { cRefs.current[id] = el; };

  // ── Calculations ──
  const ENG_BASE = 72.4;
  const eng = +(Math.min(100, Math.max(40,
    ENG_BASE
    + (vals.activeRate - BASE.activeRate) * 0.22
    + (vals.ononeRate  - BASE.ononeRate)  * 0.15
    + (vals.challenges - BASE.challenges) * 0.015
    + (vals.helps      - BASE.helps)      * 0.07
  )).toFixed(1));

  const RET_BASE = 98.1;
  const retention = +(Math.min(99.9, Math.max(85,
    RET_BASE + (eng - ENG_BASE) * 0.1
  )).toFixed(1));

  const SKILL_BASE = 22;
  const skill = +(Math.min(60, Math.max(0,
    SKILL_BASE
    + (vals.challenges - BASE.challenges) * 0.05
    + (vals.helps      - BASE.helps)      * 0.1
  )).toFixed(1));

  const engDelta     = eng - ENG_BASE;
  const retDelta     = retention - RET_BASE;
  const profitImpact = Math.round(engDelta * 4500 + retDelta * 5000);
  const salesImpact  = +(retDelta * 0.23).toFixed(2);
  const perImpact    = +(engDelta * 0.1 + retDelta * 0.28).toFixed(2);
  const hasChanged   = JSON.stringify(vals) !== JSON.stringify(BASE);

  const fmtMoney = (万) => {
    if (万 === 0) return '±0';
    const s = 万 > 0 ? '+' : '';
    return Math.abs(万) >= 10000
      ? `${s}${(万 / 10000).toFixed(1)}億円`
      : `${s}${Math.round(万).toLocaleString()}万円`;
  };

  // ── SVG path calculation ──
  const recalc = () => {
    const map = mapRef.current;
    if (!map) return;
    const cr = map.getBoundingClientRect();
    if (!cr.width) return;
    setSvgDims({ w: cr.width, h: cr.height });

    const edge = (id, side) => {
      const el = cRefs.current[id];
      if (!el) return null;
      const rr = el.getBoundingClientRect();
      return {
        x: side === 'right' ? rr.right - cr.left : rr.left - cr.left,
        y: rr.top - cr.top + rr.height / 2,
      };
    };

    setSvgPaths(CAUSAL_CONNECTIONS.map(c => {
      const s = edge(c.from, 'right');
      const d = edge(c.to,   'left');
      if (!s || !d) return null;
      const mx = (s.x + d.x) / 2;
      const color   = c.layer === 'LI' ? '#6366F1' : '#10B981';
      const opacity = c.strength === 'strong' ? 0.38 : c.strength === 'medium' ? 0.2 : 0.09;
      const sw      = c.strength === 'strong' ? 1.5 : 1;
      const dash    = c.strength === 'medium' ? '4 3' : c.strength === 'weak' ? '2 5' : null;
      return {
        ...c,
        path: `M${s.x},${s.y} C${mx},${s.y} ${mx},${d.y} ${d.x},${d.y}`,
        sx: s.x, sy: s.y, dx: d.x, dy: d.y,
        color, opacity, sw, dash,
      };
    }).filter(Boolean));
  };

  useEffect(() => {
    rafRef.current = requestAnimationFrame(recalc);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selected]);

  useEffect(() => {
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  // ── Card style helpers ──
  const COL = { lead: '#6366F1', mid: '#10B981', lag: '#F59E0B' };

  const baseCard = (accent, extra = {}) => ({
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderLeft: `3px solid ${accent}`,
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    transition: 'all 0.2s',
    ...extra,
  });

  const deltaColor = (d) => d > 0 ? 'var(--success)' : 'var(--danger)';

  const calcBg = (value, base) => {
    const d = value - base;
    if (d > 0.04)  return { bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.3)' };
    if (d < -0.04) return { bg: 'rgba(239,68,68,0.04)',  border: 'rgba(239,68,68,0.25)' };
    return { bg: 'var(--surface)', border: 'var(--border)' };
  };

  const btnSt = {
    width: 24, height: 24, borderRadius: 5,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    fontSize: 14, fontWeight: 700, color: 'var(--text-3)',
    cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
  };

  // ── Column header ──
  const ColHd = ({ title, en, cadence, color }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>{cadence}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 13, marginTop: 1 }}>{en}</div>
    </div>
  );

  // ── Leading card ──
  const LeadCard = ({ id, label, unit, step = 1, lo = 0, hi = 999 }) => {
    const val   = vals[id];
    const base  = BASE[id];
    const delta = val - base;
    const isSel = selected === id;
    return (
      <div
        ref={r(id)}
        onClick={() => toggle(id)}
        style={baseCard(isSel ? 'var(--brand)' : COL.lead, {
          cursor: 'pointer',
          boxShadow: isSel ? '0 0 0 3px var(--brand-soft)' : 'none',
        })}
      >
        <div style={{ fontSize: 11, marginBottom: 8, color: isSel ? 'var(--brand)' : 'var(--text-3)', fontWeight: isSel ? 600 : 400 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); set(id, val - step, lo, hi); }} style={btnSt}>−</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{val}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 3 }}>{unit}</span>
            {delta !== 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 600, marginLeft: 4, color: deltaColor(delta) }}>
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); set(id, val + step, lo, hi); }} style={btnSt}>+</button>
        </div>
      </div>
    );
  };

  // ── Calc card (intermediate) ──
  const CalcCard = ({ id, label, value, base, unit }) => {
    const { bg, border } = calcBg(value, base);
    const delta = +(value - base).toFixed(1);
    const good = delta > 0.04, bad = delta < -0.04;
    return (
      <div ref={r(id)} style={{ background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${COL.mid}`, borderRadius: 'var(--radius)', padding: '12px 14px', transition: 'all 0.3s' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: good ? 'var(--success)' : bad ? 'var(--danger)' : 'var(--text-1)', transition: 'color 0.3s' }}>
            {value.toFixed(1)}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{unit}</span>
          {(good || bad) && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: good ? 'var(--success)' : 'var(--danger)' }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Impact card (lagging) ──
  const ImpactCard = ({ id, label, value, isPos }) => (
    <div
      ref={r(id)}
      style={{
        background: isPos === null ? 'var(--surface)' : isPos ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        border: `1px solid ${isPos === null ? 'var(--border)' : isPos ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
        borderLeft: `3px solid ${COL.lag}`,
        borderRadius: 'var(--radius)', padding: '12px 14px', transition: 'all 0.3s',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: isPos === null ? 13 : 22, fontWeight: 700, letterSpacing: '-0.02em',
        color: isPos === null ? 'var(--text-4)' : isPos ? 'var(--success)' : 'var(--danger)',
        transition: 'all 0.3s',
      }}>{value}</div>
    </div>
  );

  // ── Detail panel bar row ──
  const BarRow = ({ label, color, left, right, pct }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {left  && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{left}</span>}
          {right && <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--danger)' }}>{right}</span>}
        </div>
      </div>
      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, opacity: 0.7, transition: 'width 0.4s' }} />
      </div>
    </div>
  );

  // ── Detail panel content (全幅レイアウト) ──
  const StatCards = ({ items }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(s => (
        <div key={s.l} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 4 }}>{s.l}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: s.color ?? 'var(--text-1)' }}>{s.v}</div>
        </div>
      ))}
    </div>
  );

  const BarGrid = ({ rows }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
      {rows.map(r => r)}
    </div>
  );

  const detailBody = () => {
    if (!selected || !allData) return null;

    if (selected === 'ononeRate') {
      const rows = DEPTS.map(d => {
        const o = allData[d.id].onone;
        return { ...d, thisWeek: o.thisWeek, target: o.target, rate: Math.round(o.thisWeek / o.target * 100) };
      }).sort((a, b) => a.rate - b.rate);
      const tt = rows.reduce((s, r) => s + r.thisWeek, 0);
      const tg = rows.reduce((s, r) => s + r.target, 0);
      const tr = Math.round(tt / tg * 100);
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'start' }}>
          <StatCards items={[
            { l: '今週実施', v: `${tt}件` },
            { l: '目標',     v: `${tg}件` },
            { l: '達成率',   v: `${tr}%`, color: tr >= 70 ? 'var(--success)' : 'var(--danger)' },
          ]} />
          <BarGrid rows={rows.map(r => <BarRow key={r.id} label={r.name} color={r.color} left={`${r.thisWeek}/${r.target}件`} right={`${r.rate}%`} pct={r.rate} />)} />
        </div>
      );
    }

    if (selected === 'activeRate') {
      const rows = DEPTS.map(d => ({ ...d, a: allData[d.id].activeCount, p: allData[d.id].activePercent })).sort((a, b) => a.p - b.p);
      const ta = rows.reduce((s, r) => s + r.a, 0);
      const tp = DEPTS.reduce((s, d) => s + d.people, 0);
      const tr = Math.round(ta / tp * 100);
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'start' }}>
          <StatCards items={[
            { l: 'アクティブ', v: `${ta}人` },
            { l: '全体',       v: `${tp}人` },
            { l: '比率',       v: `${tr}%`, color: 'var(--brand)' },
          ]} />
          <BarGrid rows={rows.map(r => <BarRow key={r.id} label={r.name} color={r.color} left={`${r.a}/${r.people}人`} right={`${r.p}%`} pct={r.p} />)} />
        </div>
      );
    }

    if (selected === 'challenges') {
      const totals = { challenge: 0, learn: 0, help: 0, onone: 0 };
      DEPTS.forEach(d => allData[d.id].weekly.slice(-4).forEach(w => {
        totals.challenge += w.challenge; totals.learn += w.learn; totals.help += w.help; totals.onone += w.onone;
      }));
      const total = Object.values(totals).reduce((a, b) => a + b, 0);
      const cats = [
        { k: 'challenge', label: '挑戦', color: '#6366F1' },
        { k: 'learn', label: '失敗・学び', color: '#F59E0B' },
        { k: 'help', label: '助け合い', color: '#10B981' },
        { k: 'onone', label: '1on1', color: '#8B5CF6' },
      ];
      const wk = Array.from({ length: 8 }, (_, i) => DEPTS.reduce((s, d) => s + (allData[d.id].weekly[i + 4]?.total ?? 0), 0));
      const mx = Math.max(...wk, 1);
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>カテゴリ別内訳（直近4週）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cats.map(c => <BarRow key={c.k} label={c.label} color={c.color} left={`${totals[c.k]}件`} right={`${Math.round(totals[c.k] / total * 100)}%`} pct={totals[c.k] / total * 100} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>週次推移（直近8週）</div>
            <svg viewBox="0 0 320 64" style={{ width: '100%', height: 64 }}>
              {wk.map((v, i) => {
                const h = Math.max(4, (v / mx) * 56);
                return <rect key={i} x={i * 40 + 4} y={60 - h} width={28} height={h} rx={3} fill="#6366F1" opacity={i === 7 ? 0.7 : 0.22} />;
              })}
            </svg>
          </div>
        </div>
      );
    }

    if (selected === 'helps') {
      const rows = DEPTS.map(d => ({
        ...d, t: allData[d.id].weekly.slice(-4).reduce((s, w) => s + w.help, 0),
      })).sort((a, b) => b.t - a.t);
      const mx = rows[0]?.t || 1;
      return (
        <BarGrid rows={rows.map(r => <BarRow key={r.id} label={r.name} color={r.color} left={`${r.t}件`} pct={r.t / mx * 100} />)} />
      );
    }

    return null;
  };

  const panelTitle = {
    activeRate: '部門別アクティブ率',
    ononeRate:  '1on1 実施状況',
    challenges: '挑戦記録の内訳（直近4週）',
    helps:      '助け合いの状況（直近4週）',
  };

  // ── SVG legend ──
  const Legend = () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 4 }}>
      {[
        { color: '#6366F1', label: '先行→中間への影響' },
        { color: '#10B981', label: '中間→遅行への影響' },
      ].map(l => (
        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="24" height="10" viewBox="0 0 24 10">
            <line x1="0" y1="5" x2="24" y2="5" stroke={l.color} strokeWidth="1.5" opacity="0.6" />
          </svg>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.label}</span>
        </div>
      ))}
      {[
        { dash: '4 3', label: '中程度' },
        { dash: '2 5', label: '弱い影響' },
      ].map(l => (
        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="24" height="10" viewBox="0 0 24 10">
            <line x1="0" y1="5" x2="24" y2="5" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray={l.dash} />
          </svg>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>人的資本の因果連鎖</h1>
          <div className="sub">指標間のつながりと、経営成果への波及を一覧する</div>
        </div>
        <div className="page-title-actions">
          {hasChanged && <button className="topbar-action" onClick={() => setVals({ ...BASE })}>ベースに戻す</button>}
          <button className="topbar-action primary"><Icon.Sparkle />エクスポート</button>
        </div>
      </div>

      <Legend />

      {/* ── Flow map ── */}
      <div ref={mapRef} style={{ position: 'relative' }}>

          {/* SVG overlay */}
          {svgDims.w > 0 && (
            <svg
              width={svgDims.w} height={Math.max(svgDims.h, 10)}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
            >
              {svgPaths.map((p, i) => (
                <g key={i}>
                  <path
                    d={p.path} fill="none"
                    stroke={p.color} strokeWidth={p.sw}
                    strokeDasharray={p.dash ?? undefined}
                    opacity={p.opacity} strokeLinecap="round"
                  />
                  <circle cx={p.dx} cy={p.dy} r={2.5} fill={p.color} opacity={Math.min(1, p.opacity * 2.2)} />
                </g>
              ))}
            </svg>
          )}

          {/* 3 columns */}
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

            {/* Leading */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ColHd title="先行指標" en="Leading Indicators" cadence="日次〜週次" color={COL.lead} />
              <LeadCard id="activeRate"  label="アクティブ率"      unit="%" lo={0} hi={100} />
              <LeadCard id="ononeRate"   label="1on1実施率"        unit="%" lo={0} hi={100} />
              <LeadCard id="challenges"  label="挑戦記録数 / 週"   unit="件" step={5} lo={0} hi={500} />
              <LeadCard id="helps"       label="助け合い件数 / 週" unit="件" lo={0} hi={200} />
            </div>

            <div style={{ width: 100, flexShrink: 0 }} />

            {/* Intermediate */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ColHd title="中間指標" en="Intermediate Indicators" cadence="月次" color={COL.mid} />
              <CalcCard id="eng"       label="エンゲージメントスコア" value={eng}       base={ENG_BASE}   unit="pt" />
              <CalcCard id="retention" label="従業員定着率"           value={retention} base={RET_BASE}   unit="%" />
              <CalcCard id="skill"     label="スキル向上実感率"       value={skill}     base={SKILL_BASE} unit="%" />
            </div>

            <div style={{ width: 100, flexShrink: 0 }} />

            {/* Lagging */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ColHd title="遅行指標" en="Lagging Indicators" cadence="四半期〜年次" color={COL.lag} />
              <ImpactCard id="profit" label="営業利益への影響"  value={hasChanged ? fmtMoney(profitImpact) : '—'} isPos={hasChanged ? profitImpact >= 0 : null} />
              <ImpactCard id="sales"  label="売上成長率への影響" value={hasChanged ? `${salesImpact >= 0 ? '+' : ''}${salesImpact}%` : '—'} isPos={hasChanged ? salesImpact >= 0 : null} />
              <ImpactCard id="per"    label="PER変化"           value={hasChanged ? `${perImpact >= 0 ? '+' : ''}${perImpact}pt` : '—'} isPos={hasChanged ? perImpact >= 0 : null} />
            </div>
          </div>
        </div>

      {/* Detail panel — フローマップの下に表示 */}
      {selected && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px', animation: 'fadein 0.18s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{panelTitle[selected]}</span>
            <button onClick={() => setSelected(null)} style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>✕</button>
          </div>
          {detailBody()}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.6 }}>
        推計根拠 — エンゲージ1pt: +4,500万（Gallup 2023）· 定着率1pt: +5,000万（同）· 離職率1%: 売上成長率−0.23%（Siebert et al.）· HR評価1pt: PER +6.77pt（非製造業・当年）
      </div>
    </div>
  );
}

window.CausalView = CausalView;
