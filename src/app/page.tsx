import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";

import FAQSection from "../components/layout/FAQSection";
import HeroSearch from "../components/home/Hero/HeroSearch";
import TravelPromoSection from "../components/layout/TravelPromoSection1";
import RouteMap from "../components/layout/RouteMap";
import RavelDealsCarousel from "../components/layout/raveldealscarousel";

import ScrollReveal from "../components/ui/ScrollReveal";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero stays immediately visible */}
        <HeroSearch />

        <ScrollReveal>
          <TravelPromoSection />
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <RavelDealsCarousel />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <RouteMap />
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <FAQSection />
        </ScrollReveal>
      </main>

      <Footer />
    </>
  );
}