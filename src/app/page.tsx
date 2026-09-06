import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
// import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";
import FAQSection from "../components/layout/FAQSection";
import HeroSearch from "../components/home/Hero/HeroSearch";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
      <HeroSearch />
        {/* <HeroSection /> */}
        <ServicesSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}