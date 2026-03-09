// ─── Mock Data for UI Prototype ───────────────────────────────────────────────
// Replace with real API calls once the backend is in place.

export const MOCK_OTP = "123456";

export const mockDonors = [
  {
    id: 1,
    name: "Ahmed Benali",
    email: "ahmed@example.com",
    password: "demo123",
    createdAt: "2025-01-10",
    engagement: {
      totalPledge: 1000,
      startDate: "2025-01-10",
      endDate: `${new Date().getFullYear()}-12-31`,
    },
    payments: [
      { id: 1, amount: 200, date: "2025-01-20", method: "zeffy", note: "" },
      { id: 2, amount: 150, date: "2025-02-15", method: "zeffy", note: "" },
      { id: 3, amount: 50,  date: "2025-03-05", method: "cash",  note: "Paid at the mosque office" },
    ],
  },
  {
    id: 2,
    name: "Fatima Choudhry",
    email: "fatima@example.com",
    password: "demo123",
    createdAt: "2025-02-01",
    engagement: {
      totalPledge: 2000,
      startDate: "2025-02-01",
      endDate: `${new Date().getFullYear()}-12-31`,
    },
    payments: [
      { id: 1, amount: 500, date: "2025-02-05", method: "zeffy", note: "" },
      { id: 2, amount: 500, date: "2025-04-10", method: "zeffy", note: "" },
    ],
  },
  {
    id: 3,
    name: "Youssef Mansour",
    email: "youssef@example.com",
    password: "demo123",
    createdAt: "2025-03-15",
    engagement: {
      totalPledge: 500,
      startDate: "2025-03-15",
      endDate: `${new Date().getFullYear()}-12-31`,
    },
    payments: [
      { id: 1, amount: 500, date: "2025-03-20", method: "zeffy", note: "" },
    ],
  },
];

export const mockAdmins = [
  {
    id: 1,
    name: "Imam Abdallah",
    email: "admin@masjid.com",
    password: "admin123",
    createdAt: "2025-01-01",
    addedBy: null,
  },
];

export const mockRequests = [
  {
    id: 1,
    type: "account_creation",
    name: "Omar Khalid",
    email: "omar@example.com",
    message: "I would like to create an account and link my $300 cash donation from February.",
    createdAt: "2025-03-01",
    status: "pending",
    attachments: [],
  },
  {
    id: 2,
    type: "payment_upload",
    name: "Sara Nasser",
    email: "sara@example.com",
    message: "I paid $200 in cash at the mosque on March 5th. Please add it to my record.",
    createdAt: "2025-03-06",
    status: "pending",
    attachments: [],
  },
  {
    id: 3,
    type: "payment_upload",
    name: "Ahmed Benali",
    email: "ahmed@example.com",
    message: "I also gave $100 to the treasurer at Friday prayer — please add it.",
    createdAt: "2025-03-08",
    status: "pending",
    attachments: [],
  },
];

export const mockLogs = [
  {
    id: 1,
    timestamp: "2025-01-10T10:00:00.000Z",
    actor: "Donor: Ahmed Benali",
    action: "donor_registered",
    details: "Ahmed Benali created an account (ahmed@example.com)",
  },
  {
    id: 2,
    timestamp: "2025-01-10T10:05:00.000Z",
    actor: "Donor: Ahmed Benali",
    action: "engagement_created",
    details: "Ahmed Benali set up an engagement: $1,000 by 2025-12-31",
  },
  {
    id: 3,
    timestamp: "2025-01-20T14:30:00.000Z",
    actor: "System",
    action: "payment_recorded",
    details: "Payment of $200 recorded for Ahmed Benali via Zeffy",
  },
  {
    id: 4,
    timestamp: "2025-02-01T09:15:00.000Z",
    actor: "Donor: Fatima Choudhry",
    action: "donor_registered",
    details: "Fatima Choudhry created an account (fatima@example.com)",
  },
  {
    id: 5,
    timestamp: "2025-02-01T09:20:00.000Z",
    actor: "Donor: Fatima Choudhry",
    action: "engagement_created",
    details: "Fatima Choudhry set up an engagement: $2,000 by 2025-12-31",
  },
  {
    id: 6,
    timestamp: "2025-03-01T11:00:00.000Z",
    actor: "Donor: Omar Khalid",
    action: "request_submitted",
    details: "Omar Khalid submitted an account creation request",
  },
  {
    id: 7,
    timestamp: "2025-03-08T16:45:00.000Z",
    actor: "Donor: Ahmed Benali",
    action: "request_submitted",
    details: "Ahmed Benali submitted a payment upload request",
  },
];

/** Returns payments linked to an email in the Zeffy mock data. */
export function findDonationsByEmail(email) {
  const donor = mockDonors.find(
    (d) => d.email.toLowerCase() === email.toLowerCase()
  );
  return donor ? donor.payments : [];
}

/** Returns a donor by email, or null. */
export function findDonorByEmail(email) {
  return (
    mockDonors.find((d) => d.email.toLowerCase() === email.toLowerCase()) || null
  );
}
