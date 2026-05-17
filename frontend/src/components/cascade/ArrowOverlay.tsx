"use client";

import { useMemo } from "react";

import type { Edge } from "@/lib/cascade/types";

import { useCascade } from "./CascadeContext";

const ARROW_COLOR = "#334155"; // ink-primary
const STRONG_MARKER_ID = "cascade-arrow-strong";
const WEAK_MARKER_ID = "cascade-arrow-weak";

const MIN_THRESHOLD = 0.1;

type Props = {
  edges: Edge[];
  /** 現在の焦点（hover > click）。null なら矢印は非表示。 */
  activeId: string | null;
};

type DrawnPath = {
  key: string;
  d: string;
  strokeWidth: number;
  strokeOpacity: number;
  dasharray?: string;
  markerId: string;
};

export function ArrowOverlay({ edges, activeId }: Props) {
  const { getRect, layoutVersion, containerSize } = useCascade();

  const paths = useMemo<DrawnPath[]>(() => {
    // layoutVersion はレイアウト変動の合図として依存に入れる（値自体は使わない）
    void layoutVersion;
    if (!activeId) return [];

    const out: DrawnPath[] = [];
    for (const e of edges) {
      // 1ホップのみ：activeId から直接出ている辺だけ描画
      if (e.from_id !== activeId) continue;
      const mag = Math.abs(e.coefficient);
      if (mag < MIN_THRESHOLD) continue;

      const a = getRect(e.from_id);
      const b = getRect(e.to_id);
      if (!a || !b) continue;
      // 左→右の前提。逆方向はスキップ
      if (b.left <= a.right - 4) continue;

      const x1 = a.right;
      const y1 = a.top + a.height / 2;
      const x2 = b.left;
      const y2 = b.top + b.height / 2;
      const dx = Math.max(24, x2 - x1);
      const c1x = x1 + dx * 0.5;
      const c2x = x2 - dx * 0.5;
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1x.toFixed(2)} ${y1.toFixed(2)}, ${c2x.toFixed(2)} ${y2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;

      // 線種は backend が style="solid"/"dashed" で指定。
      // 旧仕様（係数閾値で判定）は撤廃。
      const isDashed = e.style === "dashed";
      out.push({
        key: `${e.from_id}->${e.to_id}`,
        d,
        strokeWidth: isDashed ? 1.2 : 1.5,
        strokeOpacity: isDashed ? 0.6 : 0.8,
        dasharray: isDashed ? "5 3" : undefined,
        markerId: isDashed ? WEAK_MARKER_ID : STRONG_MARKER_ID,
      });
    }
    return out;
  }, [edges, activeId, getRect, layoutVersion]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 transition-opacity duration-200"
      width={containerSize.width || "100%"}
      height={containerSize.height || "100%"}
      style={{ opacity: activeId ? 1 : 0 }}
      aria-hidden
    >
      <defs>
        <marker
          id={STRONG_MARKER_ID}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW_COLOR} fillOpacity={0.8} />
        </marker>
        <marker
          id={WEAK_MARKER_ID}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW_COLOR} fillOpacity={0.6} />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          stroke={ARROW_COLOR}
          strokeWidth={p.strokeWidth}
          strokeOpacity={p.strokeOpacity}
          strokeDasharray={p.dasharray}
          fill="none"
          markerEnd={`url(#${p.markerId})`}
        />
      ))}
    </svg>
  );
}
