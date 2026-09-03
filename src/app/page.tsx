import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        <HeroSection />
        <ServicesSection />
      </main>

      <Footer />
    </>
  );
}