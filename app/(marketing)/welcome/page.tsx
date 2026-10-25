import type { Metadata } from "next";
import { Closing } from "@/features/landing/Closing";
import { CookingSpotlight } from "@/features/landing/CookingSpotlight";
import { Faq } from "@/features/landing/Faq";
import { Hero } from "@/features/landing/Hero";
import { Journey } from "@/features/landing/Journey";
import { KitchenCheckDemo } from "@/features/landing/KitchenCheckDemo";
import { LandingNav } from "@/features/landing/LandingNav";
import { DishMarquee, Manifesto } from "@/features/landing/Manifesto";
import { Stories } from "@/features/landing/Stories";
import { Testimonials } from "@/features/landing/Testimonials";
import { FeatureGrid, Toolkit } from "@/features/landing/Toolkit";

export const metadata: Metadata = {
  title: { absolute: "Fork: cook Nigerian food, one calm step at a time" },
  description:
    "Fork checks what's in your kitchen, builds your shopping list, and walks you through every step with timers, read-aloud and voice commands.",
};

/**
 * Landing page. Narrative order, each section handing to the next:
 * promise → real food → the problem → how it works → 01 check (try it,
 * scale/swap/list) → 02 cook → stories → voices → everything → questions
 * → last call.
 */
export default function WelcomePage() {
  return (
    <>
      <LandingNav />
      <main id="main-content" tabIndex={-1} className="overflow-x-clip">
        <Hero />
        <DishMarquee />
        <Manifesto />
        <Journey />
        <KitchenCheckDemo />
        <Toolkit />
        <CookingSpotlight />
        <Stories />
        <Testimonials />
        <FeatureGrid />
        <Faq />
      </main>
      <Closing />
    </>
  );
}
