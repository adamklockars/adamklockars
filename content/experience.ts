export type Role = {
  company: string;
  title: string;
  period: string;
  blurb: string;
};

export const experience: Role[] = [
  {
    company: "Zoom",
    title: "Senior Engineering Manager — App Marketplace",
    period: "2021 – 2026",
    blurb:
      "Led US engineering for Zoom's App Marketplace: the Unified Build Flow, the Actions automation framework, partner monetization, and developer-productivity tooling across the ecosystem.",
  },
  {
    company: "SurveyMonkey (Momentive)",
    title: "Senior Engineering Manager — Use Cases",
    period: "2017 – 2021",
    blurb:
      "Led cross-functional teams building data-intensive, insight-driven capabilities, expanding the platform into advanced market-research use cases.",
  },
  {
    company: "SurveyMonkey",
    title: "Engineering Manager — APIs & Integrations",
    period: "2015 – 2017",
    blurb:
      "Owned the App Marketplace and developer APIs, shipping 15+ first-party integrations including Salesforce, Slack, Zapier, Tableau and Microsoft Teams.",
  },
  {
    company: "Fluidware · SurveyMonkey",
    title: "Software Developer → Engineer",
    period: "2012 – 2015",
    blurb:
      "Built enterprise survey-platform features (APIs, automation, integrations) on FluidSurveys, and led the FluidSurveys → SurveyMonkey migration that preserved enterprise revenue.",
  },
];

export const education = {
  school: "University of Waterloo",
  credential: "BAS, Computer Engineering",
  detail: "Option in Management Science",
  period: "2006 – 2012",
};
