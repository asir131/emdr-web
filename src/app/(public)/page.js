import EMDRSection from "@/components/publicComponents/EMDRSection";
import FAQSection from "@/components/publicComponents/FAQSection";
import HomeHero from "@/components/publicComponents/HomeHero";
import PathToHealing from "@/components/publicComponents/PathToHealing";
import ProvenResults from "@/components/publicComponents/ProvenResults";
import TestimonialsSection from "@/components/publicComponents/TestimonialsSection";
import WhoIsItFor from "@/components/publicComponents/WhoIsItFor";

export default function HomePage() {
  return (
    <div className="">
      <HomeHero />
      <EMDRSection />
      <WhoIsItFor />
      <TestimonialsSection />
      <PathToHealing />
      <ProvenResults />
      <FAQSection />
    </div>
  );
}
