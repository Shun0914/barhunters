"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { IndicatorMeta } from "@/lib/cascade/meta";
import type { Reliability } from "@/lib/cascade/types";

type Header = {
  label: string;
  /** 列名などのカテゴリラベル（例：「事業実績・外部評価」）。 */
  categoryLabel?: string | null;
  target?: number | null;
  unit?: string | null;
  reliability?: Reliability | null;
};

type Props = {
  /** null なら閉じている。 */
  detailId: string | null;
  header: Header | null;
  /** GET /api/cascade/indicator-meta から取得した構造化説明。 */
  indicatorMeta: IndicatorMeta | null;
  /** 単位付きフォーマッタ（IndicatorCard と同じものを使う想定）。 */
  formatValue: (v: number | null | undefined, unit?: string | null) => string;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function IndicatorDetailModal({
  detailId,
  header,
  indicatorMeta,
  formatValue,
  onClose,
}: Props) {
  const open = detailId !== null && header !== null;
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Esc / Tab trap / body scroll lock / 初期フォーカス
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // モーダル表示直後にフォーカスを × ボタンへ
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !header) return null;

  const targetText =
    header.target !== null && header.target !== undefined
      ? formatValue(header.target, header.unit)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="indicator-detail-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 rounded-md p-1 text-ink-secondary hover:bg-brand-bg-light hover:text-ink-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="pr-8">
          <h2
            id="indicator-detail-title"
            className="text-xl font-semibold tracking-tight text-ink-primary"
          >
            {header.label}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {header.categoryLabel ? (
              <span className="rounded-md bg-brand-bg-light px-2 py-0.5 font-medium text-brand-primary">
                {header.categoryLabel}
              </span>
            ) : null}
            {targetText ? (
              <span className="rounded-md bg-status-ok-bg px-2 py-0.5 font-medium text-status-ok-fg">
                目標 {targetText}
              </span>
            ) : null}
            {header.reliability ? (
              <span className="rounded-md bg-status-warn-bg px-2 py-0.5 font-medium text-brand-accent">
                {header.reliability}
              </span>
            ) : null}
          </div>
        </header>

        {indicatorMeta ? (
          <>
            <DetailSection
              title="何を測る指標か"
              body={indicatorMeta.description.measures}
            />
            <DetailSection
              title="測定方法"
              body={indicatorMeta.description.measurement}
            />
            <DetailSection
              title="目標値の根拠"
              body={indicatorMeta.description.targetRationale}
            />
            {indicatorMeta.reference ? (
              <section className="mt-4">
                <h3 className="text-xs font-semibold text-ink-secondary">参考文献</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                  {indicatorMeta.reference}
                </p>
              </section>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-secondary">
            この指標の詳細説明は準備中です。
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-4">
      <h3 className="text-[15px] font-semibold text-ink-primary">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-primary">{body}</p>
    </section>
  );
}
