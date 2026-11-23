import { createClient } from "@/lib/supabase/server";
import { containerClass, SectionHeading } from "./common";

type Testimonial = { id: string; customer_initials: string; rating: number; quote: string };

export async function RiderTestimonials() {
  let testimonials: Testimonial[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_rider_testimonials");
    if (!error) testimonials = (data ?? []) as Testimonial[];
  } catch { /* No public feedback or missing migration must not break landing. */ }
  if (!testimonials.length) return null;
  return <section id="rider-testimonials" aria-labelledby="testimonials-title" className="py-10">
    <div className={containerClass}>
      <SectionHeading eyebrow="Delivery experiences" title="Customer testimonials" />
      <h2 id="testimonials-title" className="sr-only">Approved rider feedback</h2>
      <p className="mb-6 text-sm text-muted-foreground">Selected positive delivery comments, shared with customer permission and reviewed by our admin. These testimonials are not an overall rating of all deliveries.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {testimonials.map(row => <figure key={row.id} className="min-w-0 rounded-xl border bg-background p-5">
          <p className="mb-3 text-lg font-bold text-amber-700 dark:text-amber-400">★ {Number(row.rating).toFixed(1)} / 5</p>
          <blockquote className="whitespace-pre-wrap text-base leading-7 [overflow-wrap:anywhere]">{row.quote}</blockquote>
          <figcaption className="mt-4 text-sm font-bold">{row.customer_initials} · Customer</figcaption>
        </figure>)}
      </div>
    </div>
  </section>;
}
