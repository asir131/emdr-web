
import FAQSection from "@/components/publicComponents/FAQSection";
import HowThisActually from "@/components/publicComponents/HowThisActually";
import InKindSection from "@/components/publicComponents/InKindSection";
import PricingSection from "@/components/publicComponents/PricingSection";
import ReadytoRewind from "@/components/publicComponents/ReadytoRewind";
import Therapyshouldn from "@/components/publicComponents/Therapyshouldn";
import WhatIncluded from "@/components/publicComponents/WhatIncluded ";
import React from "react";

const Page = () => {
  return (
    <div>
      <ReadytoRewind></ReadytoRewind>
      <HowThisActually></HowThisActually>
      <Therapyshouldn></Therapyshouldn>
      <WhatIncluded></WhatIncluded>
      <PricingSection></PricingSection>
      <InKindSection></InKindSection>
      <FAQSection></FAQSection>



      {/* <PricingSection></PricingSection>
      <EMDRheroSection />
      <HowEMDRWorks
      />
      <TraumaHealingSection />
      <NeuroscienceSection />
      <EMDRJourney />
      <ProvenResults />
      <EMDRComparison />
      <EmdrMayBe></EmdrMayBe> */}
    </div>
  );
};

export default Page;
