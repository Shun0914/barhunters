"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchAggregatedPoints,
  fetchIndicatorMeta,
  simulateCascade,
} from "@/lib/cascade/client";
import {
  COMPANY_EFFECT_IDS,
  FINANCE_IDS,
  HUDO_LIST,
  MID_IDS,
  type IndicatorMetaMap,
} from "@/lib/cascade/meta";
import {
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  ZERO_POINTS,
  type CardData,
  type CascadeResponse,
  type CategoryKey,
  type Edge,
  type PointsInput,
  type Reliability,
} from "@/lib/cascade/types";
import { cn } from "@/lib/utils";

import { ArrowOverlay } from "./ArrowOverlay";
import { CascadeProvider, useCascade } from "./CascadeContext";
import { formatNum, IndicatorCard } from "./IndicatorCard";
import { IndicatorDetailModal } from "./IndicatorDetailModal";
import { InputGrid } from "./InputGrid";
import { PlaceholderCard } from "./PlaceholderCard";

const HUDO_LABEL_DEFAULT: Record<string, string> = {
  sales_effect: "売上効果",
  revenue: "売上ドライバー",
  cost: "コスト削減",
  capital: "資本効率化",
  roic: "ROIC（参考）",
  roe: "ROE（参考）",
};

const DEBOUNCE_MS = 300;

type CardMeta = {
  label: string;
  description?: string | null;
  target?: number | null;
  unit?: string | null;
  reliability?: Reliability | null;
};

const COMPANY_EFFECT_SET = new Set<string>(COMPANY_EFFECT_IDS);
const MID_SET = new Set<string>(MID_IDS);
const FINANCE_SET = new Set<string>(FINANCE_IDS);
const HUDO_SET = new Set<string>(HUDO_LIST.map((h) => h.id));
const CATEGORY_SET = new Set<string>(CATEGORY_KEYS);

function categoryLabelOf(id: string): string | null {
  if (CATEGORY_SET.has(id)) return "みんなの活動";
  if (HUDO_SET.has(id)) return "風土・組織文化";
  if (COMPANY_EFFECT_SET.has(id)) return "会社への効果 (KPI)";
  if (MID_SET.has(id)) return "事業実績・外部評価";
  if (FINANCE_SET.has(id)) return "財務評価・企業価値";
  return null;
}

export function CascadeBoard() {
  return (
    <CascadeProvider>
      <CascadeBoardInner />
    </CascadeProvider>
  );
}

function CascadeBoardInner() {
  const [points, setPoints] = useState<PointsInput>(ZERO_POINTS);
  const [data, setData] = useState<CascadeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 初回表示中はグリッドを出さず、集計→simulate 完了まで待つ */
  const [bootstrapping, setBootstrapping] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // 指標メタは backend JSON から取得（Issue #28）。初回 fetch 中は空 map（UI は backend の値だけで動作）。
  const [indicatorMeta, setIndicatorMeta] = useState<IndicatorMetaMap>({});

  useEffect(() => {
    const ctrl = new AbortController();
    fetchIndicatorMeta(ctrl.signal)
      .then(setIndicatorMeta)
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("fetchIndicatorMeta failed:", e);
      });
    return () => ctrl.abort();
  }, []);

  // ホバー > クリック の優先度で「現在の焦点」を決める
  const activeId = hoveredId ?? selected;

  // 初回: 全社集計ポイント取得 → simulate を連続実行（空グリッドを見せない）
  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    setBootstrapping(true);
    setData(null);
    setLoading(true);

    void (async () => {
      try {
        const aggregated = await fetchAggregatedPoints(ctrl.signal);
        if (cancelled) return;
        setPoints(aggregated);
        const res = await simulateCascade(aggregated, ctrl.signal);
        if (cancelled) return;
        setData(res);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  // セル入力・リセット等: points 変更時に simulate（デバウンス）。bootstrap 中は初回効果に任せる。
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (bootstrapping) return;

    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      simulateCascade(points, ctrl.signal)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [points, bootstrapping]);

  const cardByCalcId = useMemo(() => {
    const map = new Map<string, CardData>();
    data?.cards.forEach((c) => {
      if (c.calc_id) map.set(c.calc_id, c);
    });
    return map;
  }, [data]);

  // モーダル用：全ノードの label / description / target / unit / reliability を 1 つの map に集約
  // backend から取得した indicatorMeta に target/unit が定義されている場合は cards より優先する。
  const cardMeta = useMemo(() => {
    const m = new Map<string, CardMeta>();
    for (const k of CATEGORY_KEYS) m.set(k, { label: CATEGORY_LABEL[k] });
    for (const h of HUDO_LIST) m.set(h.id, { label: h.label, description: h.desc });
    data?.cards.forEach((c) => {
      if (!c.calc_id) return;
      const override = indicatorMeta[c.calc_id];
      m.set(c.calc_id, {
        label: c.label,
        description: c.description,
        target: override?.target ?? c.target,
        unit: override?.unit ?? c.unit,
        reliability: c.reliability,
      });
    });
    return m;
  }, [data, indicatorMeta]);

  // カード表示用：value（現在値）/ target / unit / qualitative を meta + backend から決定。
  //   value: meta.baselineCurrent（静的）が優先。なければ backend の projected を使う（9セル入力で動的更新）。
  //   target/unit: meta が定義されていれば優先。なければ backend の値。
  const displayOf = useCallback(
    (id: string) => {
      const meta = indicatorMeta[id];
      const c = cardByCalcId.get(id);
      const value =
        meta?.baselineCurrent !== undefined && meta.baselineCurrent !== null
          ? meta.baselineCurrent
          : (c?.projected ?? null);
      const target =
        meta?.target !== undefined && meta.target !== null
          ? meta.target
          : (c?.target ?? null);
      const unit = meta?.unit ?? c?.unit ?? null;
      return {
        value,
        target,
        unit,
        qualitativeCurrent: meta?.qualitativeCurrent ?? null,
        qualitativeTarget: meta?.qualitativeTarget ?? null,
      };
    },
    [cardByCalcId, indicatorMeta],
  );

  // connections から下流方向の隣接リストを構築
  const adjacency = useMemo(() => {
    const m = new Map<string, string[]>();
    data?.connections.forEach((e) => {
      if (!m.has(e.from_id)) m.set(e.from_id, []);
      m.get(e.from_id)!.push(e.to_id);
    });
    return m;
  }, [data]);

  // 焦点ノード（hover > click）からのBFSで下流ノードを集める
  const highlighted = useMemo(() => {
    if (!activeId) return new Set<string>();
    const out = new Set<string>();
    const queue = [activeId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const next = adjacency.get(cur) ?? [];
      for (const n of next) {
        if (!out.has(n)) {
          out.add(n);
          queue.push(n);
        }
      }
    }
    return out;
  }, [activeId, adjacency]);

  const handleInput = useCallback((key: CategoryKey, value: number) => {
    setPoints((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelected((cur) => (cur === id ? null : id));
  }, []);

  const handleHoverEnter = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handleHoverLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleOpenDetail = useCallback((id: string) => {
    setDetailId(id);
    setHoveredId(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailId(null);
  }, []);

  const handleReset = () => setPoints(ZERO_POINTS);
  const handleSample = () => {
    // 1カテゴリあたり 2,000P → 合計 6,000P で目標達成のキャリブ
    setPoints(
      CATEGORY_KEYS.reduce((acc, k) => ({ ...acc, [k]: 2000 }), {} as PointsInput),
    );
  };

  const cardOf = (id: string): CardData | undefined => cardByCalcId.get(id);

  const total = data?.points_total ?? 0;
  const salesOku = data?.summary.sales_effect_oku ?? 0;

  const detailHeader = useMemo(() => {
    if (!detailId) return null;
    const m = cardMeta.get(detailId);
    if (!m) return null;
    return {
      label: m.label,
      categoryLabel: categoryLabelOf(detailId),
      target: m.target ?? null,
      unit: m.unit ?? null,
      reliability: m.reliability ?? null,
    };
  }, [detailId, cardMeta]);
  const detailIndicatorMeta = detailId ? (indicatorMeta[detailId] ?? null) : null;

  return (
    <div className="flex flex-col gap-1">
      {/* サマリー（ページタイトルは PageHeader） */}
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 border-b border-ink-secondary/20 pb-2">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-secondary">
          <span className="font-semibold text-ink-primary">合計</span>
          <span className="tabular-nums text-ink-primary">
            {total.toLocaleString()} pt
          </span>
          <span>/</span>
          <span className="font-semibold text-ink-primary">売上効果</span>
          <span className="tabular-nums font-semibold text-brand-primary">
            +{salesOku.toFixed(2)} 億円
          </span>
          <button
            type="button"
            onClick={handleSample}
            className="ml-2 rounded border border-ink-secondary/30 bg-card px-1.5 py-px text-[11px] text-ink-primary hover:bg-brand-bg-light"
          >
            目標値プリセット
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-ink-secondary/30 bg-card px-1.5 py-px text-[11px] text-ink-primary hover:bg-brand-bg-light"
          >
            リセット
          </button>
          <span className="text-[11px] text-ink-secondary">
            {bootstrapping || loading
              ? "読み込み中…"
              : data
                ? `更新: ${new Date(data.updated_at).toLocaleTimeString()}`
                : ""}
          </span>
        </div>
        {error ? (
          <span className="w-full text-[11px] text-status-ng-fg">⚠ {error}</span>
        ) : null}
      </div>

      {/* 5列グリッド + 矢印オーバーレイ（初回・スコープ切替はデータ準備完了まで非表示） */}
      {bootstrapping ? (
        <div className="flex min-h-[min(70vh,720px)] items-center justify-center rounded-lg border border-dashed border-ink-secondary/25 bg-brand-bg-light/40 text-sm text-ink-secondary">
          因果ストーリーを読み込んでいます…
        </div>
      ) : (
        <CascadeGrid
        connections={data?.connections ?? []}
        activeId={activeId}
      >
        {/* 列1: みんなの活動（先行指標）9個 */}
        <Column title="みんなの活動 (先行指標)" tone="leading">
          <InputGrid
            values={points}
            onChange={handleInput}
            activeId={activeId}
            highlighted={highlighted}
            onSelect={handleSelect}
            onHoverEnter={handleHoverEnter}
            onHoverLeave={handleHoverLeave}
          />
        </Column>

        {/* 列2: 風土・組織文化（7項目） */}
        <Column title="風土・組織文化" tone="bridge">
          {HUDO_LIST.map((h) => (
            <IndicatorCard
              key={h.id}
              id={h.id}
              label={h.label}
              description={h.desc}
              selected={activeId === h.id}
              highlighted={highlighted.has(h.id) && activeId !== h.id}
              dimmed={
                activeId !== null &&
                activeId !== h.id &&
                !highlighted.has(h.id)
              }
              onClick={() => handleSelect(h.id)}
              onHoverEnter={() => handleHoverEnter(h.id)}
              onHoverLeave={handleHoverLeave}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </Column>

        {/* 列3: 会社への効果（KPI 4個） */}
        <Column title="会社への効果 (KPI)" tone="leading">
          {COMPANY_EFFECT_IDS.map((id) => {
            const c = cardOf(id);
            const d = displayOf(id);
            return c ? (
              <IndicatorCard
                key={id}
                id={id}
                label={c.label}
                value={d.value}
                target={d.target}
                unit={d.unit}
                qualitativeCurrent={d.qualitativeCurrent}
                qualitativeTarget={d.qualitativeTarget}
                description={c.description}
                reliability={c.reliability}
                selected={activeId === id}
                highlighted={highlighted.has(id) && activeId !== id}
                dimmed={
                  activeId !== null && activeId !== id && !highlighted.has(id)
                }
                onClick={() => handleSelect(id)}
                onHoverEnter={() => handleHoverEnter(id)}
                onHoverLeave={handleHoverLeave}
                onOpenDetail={handleOpenDetail}
              />
            ) : (
              <PlaceholderCard key={id} label={id} hint="API応答待ち" />
            );
          })}
        </Column>

        {/* 列4: 事業実績・外部評価（中間9項目） */}
        <Column title="事業実績・外部評価" tone="bridge">
          {MID_IDS.map((id) => {
            const c = cardOf(id);
            const d = displayOf(id);
            return c ? (
              <IndicatorCard
                key={id}
                id={id}
                label={c.label}
                value={d.value}
                target={d.target}
                unit={d.unit}
                qualitativeCurrent={d.qualitativeCurrent}
                qualitativeTarget={d.qualitativeTarget}
                description={c.description}
                reliability={c.reliability}
                selected={activeId === id}
                highlighted={highlighted.has(id) && activeId !== id}
                dimmed={
                  activeId !== null && activeId !== id && !highlighted.has(id)
                }
                onClick={() => handleSelect(id)}
                onHoverEnter={() => handleHoverEnter(id)}
                onHoverLeave={handleHoverLeave}
                onOpenDetail={handleOpenDetail}
              />
            ) : (
              <PlaceholderCard key={id} label={id} hint="API応答待ち" />
            );
          })}
        </Column>

        {/* 列5: 財務評価・企業価値（遅行指標） */}
        <Column title="財務評価・企業価値 (遅行指標)" tone="lagging">
          {FINANCE_IDS.map((id) => {
            const c = cardOf(id);
            const d = displayOf(id);
            const isMain = id === "sales_effect";
            return c ? (
              <IndicatorCard
                key={id}
                id={id}
                label={c.label}
                value={d.value}
                target={d.target}
                unit={d.unit}
                qualitativeCurrent={d.qualitativeCurrent}
                qualitativeTarget={d.qualitativeTarget}
                description={c.description}
                reliability={c.reliability}
                emphasis={isMain ? "main" : "default"}
                selected={activeId === id}
                highlighted={highlighted.has(id) && activeId !== id}
                dimmed={
                  activeId !== null && activeId !== id && !highlighted.has(id)
                }
                onClick={() => handleSelect(id)}
                onHoverEnter={() => handleHoverEnter(id)}
                onHoverLeave={handleHoverLeave}
                onOpenDetail={handleOpenDetail}
              />
            ) : (
              <PlaceholderCard
                key={id}
                label={HUDO_LABEL_DEFAULT[id] ?? id}
                hint="API応答待ち"
              />
            );
          })}
        </Column>
      </CascadeGrid>
      )}

      <IndicatorDetailModal
        detailId={detailId}
        header={detailHeader}
        indicatorMeta={detailIndicatorMeta}
        formatValue={formatNum}
        onClose={handleCloseDetail}
      />
    </div>
  );
}

// グリッド + 矢印オーバーレイのラッパー。containerRef を CascadeContext に接続する。
function CascadeGrid({
  children,
  connections,
  activeId,
}: {
  children: React.ReactNode;
  connections: Edge[];
  activeId: string | null;
}) {
  const { containerRef } = useCascade();
  return (
    <div
      ref={containerRef}
      className="relative grid grid-cols-1 gap-3 lg:grid-cols-[1.05fr_0.85fr_0.92fr_0.92fr_0.92fr]"
    >
      {children}
      <ArrowOverlay edges={connections} activeId={activeId} />
    </div>
  );
}

// ════════════════════════════════════════════
// 列ラッパー（モックの背景色トーンに対応）
// ════════════════════════════════════════════
function Column({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  tone: "leading" | "bridge" | "lagging";
  children: React.ReactNode;
}) {
  // ブランドカラー移行後のトーン分け（先行/遅行は薄い brand-bg-light で識別）
  const toneClass = {
    leading: "bg-brand-bg-light/70 border-brand-primary/15",
    bridge: "bg-transparent border-transparent",
    lagging: "bg-brand-bg-light/70 border-brand-primary/15",
  }[tone];

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border px-1 py-1",
        toneClass,
      )}
    >
      <header className="flex items-baseline gap-1.5 px-0.5">
        <h2 className="text-[12px] font-medium leading-none tracking-normal text-ink-primary">
          {title}
        </h2>
        {subtitle ? (
          <span className="text-[11px] text-ink-secondary">{subtitle}</span>
        ) : null}
      </header>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}
