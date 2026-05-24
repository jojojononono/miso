const MISO_CONFIG = {
  name: "Miso",
  breed: "Nova Scotia Duck Tolling Retriever",
  birthday: "2026-03-10",

  // Adjust when you weigh him
  weightKg: 5.5,

  kibble: {
    brand: "Purina Pro Plan",
    product: "Puppy Medium — Chicken",
    expectedAdultWeightKg: 20, // Toller adult ~17–23 kg
    // Purina on-pack feeding table (g/day) by puppy age — adjust expectedAdultWeightKg if needed
    feedingTable: [
      { maxMonths: 3, min: 145, max: 265 },
      { maxMonths: 5, min: 320, max: 350 },
      { maxMonths: 8, min: 340, max: 355 },
      { maxMonths: 11, min: 300, max: 320 },
      { maxMonths: 12, min: 275, max: 275 },
    ],
  },

  // Meal times (24h) — edit to match your routine
  mealTimes: ["06:30", "12:30", "18:00"],

  // Transition to 2 meals when puppy is this many months old
  twoMealsFromMonths: 6,

  health: {
    vaccinations: [
      { dose: 1, label: "1st vaccination", date: null, done: true, note: "At breeder" },
      { dose: 2, label: "2nd vaccination · pick up Miso", date: "2026-05-26", done: false },
      { dose: 3, label: "3rd vaccination", date: "2026-06-18", done: false },
    ],
    deworming: [
      { dose: 1, label: "1st deworming tablets", date: null, done: true },
      { dose: 2, label: "2nd deworming tablets", date: "2026-05-28", done: false },
    ],
  },

  topics: [
    {
      id: "feeding",
      title: "Feeding & weight",
      icon: "🍽",
      priority: "high",
      summary: "Purina Pro Plan Puppy Medium — daily amount from the bag, body condition, and weekly weigh-ins.",
      items: ["Pro Plan Puppy Medium kibble", "Stool quality", "Growth curve"],
    },
    {
      id: "health",
      title: "Health & vet",
      icon: "🩺",
      priority: "high",
      summary: "Vaccinations, deworming, flea/tick, and upcoming vet visits.",
      items: ["Vaccination dates", "Deworming schedule", "Insurance & chip number"],
    },
    {
      id: "training",
      title: "Training",
      icon: "🎓",
      priority: "high",
      summary: "Foundation skills, recall, crate, and bite inhibition while he's young.",
      items: ["Sit / down / stay", "Recall on long line", "Crate & alone time"],
    },
    {
      id: "social",
      title: "Socialisation",
      icon: "🐕",
      priority: "high",
      summary: "Positive exposure to people, dogs, surfaces, sounds, and handling.",
      items: ["New environments weekly", "Friendly dogs (calm)", "Grooming & paws"],
    },
    {
      id: "exercise",
      title: "Exercise",
      icon: "🏃",
      priority: "medium",
      summary: "Age-appropriate activity — avoid forced running on hard surfaces.",
      items: ["5 min/month rule (rough guide)", "Sniff walks", "No long jumps yet"],
    },
    {
      id: "sleep",
      title: "Sleep & routine",
      icon: "😴",
      priority: "medium",
      summary: "Puppies need lots of rest; track nap times and evening wind-down.",
      items: ["18–20 h sleep/day", "Crate schedule", "Quiet time after meals"],
    },
    {
      id: "grooming",
      title: "Grooming",
      icon: "✂️",
      priority: "medium",
      summary: "Toller double coat — brushing, nails, ears, and teeth.",
      items: ["Brush 2–3× per week", "Nail trim", "Ear checks after water"],
    },
    {
      id: "milestones",
      title: "Milestones",
      icon: "📅",
      priority: "low",
      summary: "Teething, neuter timing, adolescent phase, and adult weight target.",
      items: ["Teething (~3–6 mo)", "Neuter discuss ~12 mo", "Adult ~17–23 kg"],
    },
  ],

  defaultChecklist: [
    "Pick up Miso — 2nd vaccination (Tue 26 May)",
    "2nd deworming tablets (Wed 28 May)",
    "Weigh Miso this week",
    "Brush coat",
    "Practice recall in garden",
  ],
};
