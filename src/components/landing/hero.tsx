import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import styles from "./hero.module.css";

/** Static brand composition stays available even before Supabase is configured. */
export function Hero() {
  return <section id="home" aria-labelledby="landing-hero-title" className={styles.hero}>
    <svg aria-hidden="true" className={styles.texture} width="100%" height="100%">
      <filter id="landing-grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" opacity=".4" filter="url(#landing-grain)" />
    </svg>
    <div className={styles.content}>
      <Image className={styles.mark} src="/landing/brand-mark.webp" alt="Ng-Wanam Food House logo" width={280} height={279} loading="eager" />
      <h1 id="landing-hero-title" className={`${styles.title} font-display`}>Ng-Wanam</h1>
      <p className={styles.subtitle}>ONLINE ORDERING &amp; DELIVERY</p>
      <div aria-hidden="true" className={styles.divider} />
      <p className={styles.tagline}>The Original and Best Pancit in Town</p>
      <p className={styles.promise}>Home-style Filipino food in Batangas City.</p>
      <Button className={styles.order} render={<Link href="/home" />}>Order Now</Button>
    </div>
  </section>;
}
