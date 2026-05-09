"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type RegisterFn = (id: string, el: HTMLElement | null) => void;

interface CascadeCtx {
  containerRef: RefObject<HTMLDivElement | null>;
  registerCard: RegisterFn;
  /** カードレイアウト変化時にインクリメント（rAF スロットル）。 */
  layoutVersion: number;
  /** コンテナ左上を原点とした登録カードの矩形を返す。 */
  getRect: (id: string) => { left: number; top: number; right: number; bottom: number; width: number; height: number } | null;
  /** SVG オーバーレイのサイズ（コンテナの実寸）。 */
  containerSize: { width: number; height: number };
}

const Ctx = createContext<CascadeCtx | null>(null);

export function useCascade(): CascadeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("CascadeContext is missing. Wrap with <CascadeProvider>.");
  return v;
}

/** カード DOM を id 付きで登録するためのフック。 ref として返り値を JSX に渡す。 */
export function useRegisterCard(id: string) {
  const { registerCard } = useCascade();
  const lastIdRef = useRef<string | null>(null);

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      if (lastIdRef.current && lastIdRef.current !== id) {
        registerCard(lastIdRef.current, null);
      }
      lastIdRef.current = id;
      registerCard(id, el);
    },
    [id, registerCard],
  );

  useEffect(() => {
    return () => {
      if (lastIdRef.current) registerCard(lastIdRef.current, null);
    };
  }, [registerCard]);

  return setRef;
}

export function CascadeProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef(new Map<string, HTMLElement>());
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  const bump = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const c = containerRef.current;
      if (c) {
        const r = c.getBoundingClientRect();
        setContainerSize((prev) =>
          prev.width === r.width && prev.height === r.height
            ? prev
            : { width: r.width, height: r.height },
        );
      }
      setLayoutVersion((v) => v + 1);
    });
  }, []);

  const registerCard = useCallback<RegisterFn>(
    (id, el) => {
      if (el) cardsRef.current.set(id, el);
      else cardsRef.current.delete(id);
      bump();
    },
    [bump],
  );

  const getRect = useCallback<CascadeCtx["getRect"]>((id) => {
    const c = containerRef.current;
    const el = cardsRef.current.get(id);
    if (!c || !el) return null;
    const cr = c.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      left: r.left - cr.left,
      top: r.top - cr.top,
      right: r.right - cr.left,
      bottom: r.bottom - cr.top,
      width: r.width,
      height: r.height,
    };
  }, []);

  // コンテナ自体のサイズ変化と、内側カードのリフロー両方に追従
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => bump());
    ro.observe(c);
    Array.from(c.querySelectorAll<HTMLElement>("[data-card-id]")).forEach((el) => ro.observe(el));

    const onScroll = () => bump();
    const onResize = () => bump();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [bump]);

  const value = useMemo<CascadeCtx>(
    () => ({ containerRef, registerCard, getRect, layoutVersion, containerSize }),
    [registerCard, getRect, layoutVersion, containerSize],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
