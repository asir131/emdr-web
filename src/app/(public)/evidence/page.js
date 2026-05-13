import EMDRComparison from "@/components/publicComponents/EMDRComparison";
import EMDRHeroSection from "@/components/publicComponents/EMDRheroSection";
import EMDRheroSection from "@/components/publicComponents/EMDRheroSection";
import EMDRJourney from "@/components/publicComponents/EMDRJourney";
import EmdrMayBe from "@/components/publicComponents/EmdrMayBe";
import HowEMDRWorks from "@/components/publicComponents/HowEMDRWorks";
import NeuroscienceSection from "@/components/publicComponents/NeuroscienceSection";
import ProvenResults from "@/components/publicComponents/ProvenResults";
import TraumaHealingSection from "@/components/publicComponents/TraumaHealingSection";
import React from "react";

const EvidencePage = () => {
  return (
    <div>
      <EMDRHeroSection />
      <HowEMDRWorks />
      <TraumaHealingSection />
      <NeuroscienceSection />
      <EMDRJourney />
      <ProvenResults />
      <EMDRComparison />
      <EmdrMayBe></EmdrMayBe>
    </div>
  );
};

export default EvidencePage;
