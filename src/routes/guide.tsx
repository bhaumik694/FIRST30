import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/shell";
import { PRODUCTS } from "@/lib/products";
import { useAppData } from "@/lib/store";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Product Guide — FIRST 30" },
      { name: "description", content: "General educational guidance, precautions and reminders for supported skincare products." },
      { property: "og:title", content: "Product Guide — FIRST 30" },
      { property: "og:description", content: "Usage reminders, patch tests and precautions for your product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

function Guide() {
  const data = useAppData();
  const mine = data?.profile?.productId;
  const list = [...PRODUCTS].sort((a, b) => (a.id === mine ? -1 : b.id === mine ? 1 : 0));
  return (
    <div>
      <PageTitle eyebrow="Product Guide" title="Know your product" sub="General educational guidance only. Always follow the instructions on your actual product label." />
      <div className="space-y-5">
        {list.map((p) => (
          <article key={p.id} className="card-soft p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl md:text-3xl">{p.name}</h2>
              {p.id === mine && <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">Your product</span>}
            </div>
            <p className="mt-3 max-w-3xl text-muted-foreground">{p.what}</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">How to use</h4>
                <ul className="mt-2 space-y-1.5 text-sm">{p.usage.map((u) => <li key={u}>{u}</li>)}</ul>
              </section>
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">Precautions</h4>
                <ul className="mt-2 space-y-1.5 text-sm">{p.precautions.map((u) => <li key={u}>{u}</li>)}</ul>
              </section>
              <section className="space-y-3 text-sm">
                <div className="rounded-xl bg-muted p-3"><strong>Patch test:</strong> try a small amount on a discreet area first and wait as your label directs.</div>
                {p.sunscreen && <div className="rounded-xl bg-accent p-3 text-accent-foreground"><strong>Sunscreen:</strong> use broad-spectrum sun protection during the day.</div>}
              </section>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">General educational guidance — not official product information. FIRST 30 is not affiliated with Be Bodywise.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
