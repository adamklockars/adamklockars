export type Project = {
  /** stable id, used for anchors and the side nav */
  id: string;
  name: string;
  /** short kicker shown above the name */
  kicker: string;
  tagline: string;
  description: string;
  features: string[];
  url: string | null;
  /** hex accent that themes the whole section */
  accent: string;
  /** optional screenshot path under /public; falls back to a styled mockup */
  image?: string;
  /** true while we're still waiting on real copy/assets */
  placeholder?: boolean;
};

export const projects: Project[] = [
  {
    id: "predictvs",
    name: "PredictVS",
    kicker: "Sports · Free-to-play",
    tagline: "Predict. Compete. Win.",
    description:
      "Free sports prediction contests — browse, join, make your picks, and climb the standings. No real money and no gambling; just you against everyone else's read on the games.",
    features: [
      "Lobby → Contest → Predict → Score → Win",
      "100% free — no credit card, no gambling",
      "Live leaderboards & Crowd Wisdom",
      "NHL · NBA · MLB · MLS",
    ],
    url: "https://predictvs.com",
    accent: "#2bd96a",
    image: undefined,
  },
  {
    id: "curveappeal",
    name: "Curve Appeal",
    kicker: "Wellness · Privacy-first",
    tagline: "Understand your body. Feel confident in your curves.",
    description:
      "A proportion calculator that runs entirely on your device. Snap a photo, drop a few overlays, and get ratio-based insight — breast, eye and lip proportions, the 2D:4D digit ratio, and golden-ratio facial analysis. Photos are never uploaded or stored.",
    features: [
      "100% on-device — photos never leave your phone",
      "Five proportion analyses",
      "Golden ratio & 2D:4D digit ratio",
      "Private, anonymized history",
    ],
    url: "https://curveappeal.me",
    accent: "#f472b6",
    image: undefined,
  },
  {
    id: "beyondthemetric",
    name: "Beyond the Metric",
    kicker: "Hockey analytics · Decision intelligence",
    tagline: "Measuring how players read the game.",
    description:
      "Coaches upload arena game video and Breakout IQ scores every decision moment against a research-backed rubric — turning raw footage into a Team IQ and player profiles that coaches and parents can actually use.",
    features: [
      "Scores every on-ice decision moment",
      "Research-backed rubric → Team IQ",
      "Strong / slow / missed reads",
      "Player profiles for coaches & parents",
    ],
    url: "https://coach.beyondthemetric.ca",
    accent: "#38bdf8",
    image: undefined,
  },
  {
    id: "tilia",
    name: "Tilia",
    kicker: "Caregiving · Dementia support",
    tagline: "One calm place to care for someone with dementia.",
    description:
      "Tilia helps families notice what's changing, remember the day-to-day, and keep everyone who helps on the same page — without juggling six different apps. A general-wellness tool, never a diagnosis.",
    features: [
      "One shared, accessible care record over time",
      "Plain-language dementia support & helplines",
      "Care circle gets a heads-up when things change",
      "Private by design — encrypted, stored in Canada",
    ],
    url: "https://tilia.care",
    accent: "#8b7ff5",
    image: undefined,
  },
];
