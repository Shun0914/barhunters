import { CascadeBoard } from "@/components/cascade/CascadeBoard";

export const metadata = { title: "因果ストーリー | barhunters" };

export default function CascadePage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-2 py-1">
      <CascadeBoard />
    </main>
  );
}
