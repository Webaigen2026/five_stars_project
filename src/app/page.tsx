import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";
import FAQSection from "../components/layout/FAQSection";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        <HeroSection />
        <ServicesSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}