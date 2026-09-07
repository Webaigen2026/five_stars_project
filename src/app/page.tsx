import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
// import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";
import FAQSection from "../components/layout/FAQSection";
import HeroSearch from "../components/home/Hero/HeroSearch";
import TravelPromoSection from "../components/layout/TravelPromoSection1";
import RouteMap from "../components/layout/RouteMap";
import RavelDealsCarousel from "../components/layout/raveldealscarousel";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
      <HeroSearch />
        {/* <HeroSection /> */}
        <TravelPromoSection />
        <RavelDealsCarousel />
        <RouteMap />
    
     
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}