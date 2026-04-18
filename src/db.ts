export interface FollowUpConfig {
  id: string;
  triggerValue: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'range';
  options?: { label: string; score: number; min?: number; max?: number }[];
  scoreIfTrue?: number;
  scoreIfAnswered?: number;
  followUps?: FollowUpConfig[];
}

export interface DonorAccount {
  id: string;
  name: string;
  password: string;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  amount: number;
  description?: string;
  date: number;
}

export interface FormQuestion {
  id: string;
  text: string;
  type: 'select' | 'boolean' | 'range';
  options?: { label: string; score: number; min?: number; max?: number }[]; // For 'select' and 'range'
  scoreIfTrue?: number; // For 'boolean' ('Yes' gets this score, 'No' gets 0)
  hasConditionalField?: boolean;
  conditionalTrigger?: string; // e.g. "Yes"
  conditionalLabel?: string;
  conditionalType?: 'text' | 'number';
  conditionalScore?: number;
  followUps?: FollowUpConfig[];
  dependsOnQuestionId?: string; // ID of the question this depends on
  dependsOnAnswer?: string; // The answer required to show this question
}

export interface Profile {
  id?: string;
  // Basic Info (Fixed)
  applicationNumber: string;
  district: string;
  name: string;
  fatherName: string;
  cnic: string;
  address: string;
  phoneNumber: string;
  supportToSustainLivelihood?: string;
  profilePicture?: string; // Base64 image
  comments?: string; // Summary / Comments
  
  // Dynamic Answers
  answers: Record<string, any>;
  conditionalAnswers: Record<string, any>;
  
  // Donations
  donations?: DonationRecord[];
  
  // Calculated
  score: number;
  scoreBreakdown: Record<string, number>;
  
  createdAt: number;
  updatedAt: number;
}

export interface CustomFilter {
  id: string;
  label: string;
  questionId: string;
  answer: string;
}

export interface Settings {
  id?: string;
  questions: FormQuestion[];
  adminPassword?: string;
  readPassword?: string;
  appLogo?: string; // Base64 image
  donors?: DonorAccount[];
  customFilters?: CustomFilter[];
}

export const defaultQuestions: FormQuestion[] = [
  {
    id: "householdSize",
    text: "Household Size (Total people)",
    type: "select",
    options: [
      { label: "1-2", score: 2 },
      { label: "3-4", score: 4 },
      { label: "5-6", score: 6 },
      { label: "+7", score: 8 }
    ]
  },
  {
    id: "houseStatus",
    text: "Housing Situation ",
    type: "select",
    options: [
      { label: "Owned house", score: 0 },
      { label: "Rented", score: 5 },
      { label: "Not Rent & Not owned ", score: 2 }
    ]
  },
  {
    id: "numberOfMobilePhones",
    text: "Number of mobile phones in the home",
    type: "select",
    options: [
      { label: "0-2", score: 0 },
      { label: "3 or 4", score: -3 },
      { label: "More then 4", score: -6 }
    ]
  },
  {
    id: "profession",
    text: "Profession",
    type: "select",
    hasConditionalField: true,
    conditionalTrigger: "Not working (can't work)",
    conditionalLabel: "Please Provide Reason",
    conditionalType: "text",
    options: [
      { label: "Daily wage labourer ", score: 8 },
      { label: "Low salary job", score: 6 },
      { label: "Stable job", score: 0 },
      { label: "Farmers ", score: 6 },
      { label: "Not working (No reasoning)", score: -10 },
      { label: "Not working (wants to work) ", score: 10 },
      { label: "Not working (can't work)", score: 10 }
    ]
  },
  {
    id: "monthlyIncome",
    text: "Total Monthly Income",
    type: "select",
    hasConditionalField: true,
    conditionalTrigger: "35k+",
    conditionalLabel: "please enter exact amount",
    conditionalType: "number",
    options: [
      { label: "0-10k", score: 10 },
      { label: "10-25k", score: 7 },
      { label: "25-35k", score: 3 },
      { label: "35k+", score: 1 }
    ]
  },
  {
    id: "q_1773451482670",
    text: "Total Monthly Expenses ",
    type: "select",
    options: [
      { label: "0-10k", score: 1 },
      { label: "10-20k", score: 3 },
      { label: "20-30k", score: 7 },
      { label: "35k+", score: 10 }
    ]
  },
  {
    id: "1773410672078",
    text: "Income Gap (Income VS Expences)",
    type: "select",
    options: [
      { label: "Deficit +20000", score: 35 },
      { label: "Deficit  16000 to 20000", score: 30 },
      { label: "Deficit 12000 to 16000", score: 25 },
      { label: "Deficit 8000 to 12000", score: 20 },
      { label: "Deficit 5000 to 8000", score: 15 },
      { label: "Deficit 2500 to 5000", score: 10 },
      { label: "Deficit below 2500 ", score: 5 },
      { label: "No deficit ", score: 0 },
      { label: "Income more then expenses ", score: -10 }
    ]
  },
  {
    id: "governmentSupport",
    text: "Regular Government support",
    type: "boolean",
    scoreIfTrue: -10,
    hasConditionalField: true,
    conditionalTrigger: "Yes",
    conditionalLabel: "Amount received",
    conditionalType: "number"
  },
  {
    id: "externalSupport",
    text: "Charity or persons Support ",
    type: "select",
    options: [
      { label: "Regular or continued support", score: -10 },
      { label: "Occasional support", score: -6 },
      { label: "Only once ", score: -3 },
      { label: "Food package ", score: -3 },
      { label: "None", score: 0 }
    ]
  },
  {
    id: "q_1773415275701",
    text: "pension in the Household ",
    type: "boolean",
    scoreIfTrue: -8
  },
  {
    id: "q_1773456943898",
    text: "Livestock/productive Assets owned ",
    type: "select",
    options: [
      { label: "None", score: 5 },
      { label: "1 to 3 Animals ", score: 3 },
      { label: "3 to 6 Animals ", score: 0 },
      { label: "7 to 10", score: -3 },
      { label: "More then 10", score: -5 }
    ]
  },
  {
    id: "q_1773456058732",
    text: "Are you a widow ",
    type: "boolean",
    scoreIfTrue: 10
  },
  {
    id: "q_1773470748691",
    text: "Please Enter Details",
    type: "select",
    dependsOnQuestionId: "q_1773456058732",
    dependsOnAnswer: "Yes",
    options: [
      { label: "With minors & Adult female Children", score: 10 },
      { label: "With minors & Adult male Children", score: 8 },
      { label: "with adult male childrens", score: 8 },
      { label: "with adult female childrens", score: 4 },
      { label: "Living alone", score: 6 }
    ]
  },
  {
    id: "q_1773461038075",
    text: "Disability or Illness ",
    type: "select",
    options: [
      { label: "Serious Disability or Illness preventing work", score: 10 },
      { label: "Minor Disability or Illness but still can work ", score: 2 },
      { label: "Serious illness but still able to work ", score: 5 },
      { label: "No Disability or Illness ", score: 0 }
    ]
  },
  {
    id: "debtForBasicNeeds",
    text: "Debt for Essential Needs ",
    type: "select",
    hasConditionalField: true,
    conditionalTrigger: "Yes",
    conditionalLabel: "Debt amount",
    conditionalType: "number",
    options: [
      { label: "Heavy dept for food or medical or education ", score: 9 },
      { label: "Dept for other other purposes ", score: -7 },
      { label: "small dept for food/medical or education ", score: 7 },
      { label: "No dept ", score: 0 }
    ]
  },
  {
    id: "q_1773458280440",
    text: "Cash available to survive ",
    type: "select",
    options: [
      { label: "No cash at all ", score: 8 },
      { label: "Upto 7 days", score: 6 },
      { label: "Upto 15 days", score: 4 },
      { label: "Upto 30 days", score: 2 },
      { label: "More then 30 days", score: 0 }
    ]
  },
  {
    id: "q_1773457517073",
    text: "Fit Male Adults (not studying, not working)",
    type: "select",
    options: [
      { label: "None", score: 0 },
      { label: "1 adult", score: -5 },
      { label: "2 adults", score: -10 },
      { label: "3 adults", score: -15 },
      { label: "4 adults ", score: -20 },
      { label: "5 adults", score: -25 }
    ]
  },
  {
    id: "q_1773457827012",
    text: "Exceptional Circumstances ",
    type: "select",
    options: [
      { label: "unexpected hardship (medical emergency etc)", score: 10 },
      { label: "Occasional Request (special case etc)", score: 10 },
      { label: "None of these", score: 0 }
    ]
  },
  {
    id: "q_1773472124019",
    text: "meaaea",
    type: "boolean",
    scoreIfTrue: 10
  },
  {
    id: "q_1773472124474",
    text: "Hi",
    type: "boolean",
    scoreIfTrue: 10,
    dependsOnQuestionId: "q_1773472124019",
    dependsOnAnswer: "Yes"
  }
];
