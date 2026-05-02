export interface MockRide {
  pickup: string;
  dropoff: string;
  initial_offer: number;
  status: "open";
}

export interface MockBid {
  driver_name: string;
  amount: number;
  status: "pending";
}

export const mockRides: MockRide[] = [
  {
    pickup: "Umayyad Square",
    dropoff: "Old City Gate",
    initial_offer: 25000,
    status: "open",
  },
  {
    pickup: "Kafarsouseh",
    dropoff: "Mezzeh Highway",
    initial_offer: 18000,
    status: "open",
  },
  {
    pickup: "Bab Touma",
    dropoff: "Damascus University",
    initial_offer: 22000,
    status: "open",
  },
];

export interface MockCompletedRide {
  id: string;
  pickup: string;
  dropoff: string;
  final_price: number;
  status: "completed";
  completed_at: string; // ISO timestamp
}

function todayAt(hours: number, minutes: number = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function daysAgoAt(daysAgo: number, hours: number, minutes: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const mockCompletedRides: MockCompletedRide[] = [
  {
    id: "cmp-001",
    pickup: "Umayyad Square",
    dropoff: "Damascus University",
    final_price: 22000,
    status: "completed",
    completed_at: todayAt(8, 15),
  },
  {
    id: "cmp-002",
    pickup: "Bab Touma",
    dropoff: "Hijaz Railway Station",
    final_price: 18000,
    status: "completed",
    completed_at: todayAt(9, 42),
  },
  {
    id: "cmp-003",
    pickup: "Marjeh Square",
    dropoff: "Al-Mouwasat Hospital",
    final_price: 30000,
    status: "completed",
    completed_at: todayAt(11, 5),
  },
  {
    id: "cmp-004",
    pickup: "Abbasiyyin Square",
    dropoff: "Mezzeh Highway",
    final_price: 28000,
    status: "completed",
    completed_at: todayAt(13, 20),
  },
  {
    id: "cmp-005",
    pickup: "Sabaa Bahrat Square",
    dropoff: "Kafarsouseh",
    final_price: 16000,
    status: "completed",
    completed_at: todayAt(14, 50),
  },
  // Yesterday — should NOT count toward today's total
  {
    id: "cmp-006",
    pickup: "Yousef al-Azmeh Square",
    dropoff: "Old City Gate",
    final_price: 25000,
    status: "completed",
    completed_at: daysAgoAt(1, 18, 30),
  },
  {
    id: "cmp-007",
    pickup: "Al-Hamidiyeh Souq",
    dropoff: "Baramkeh Bus Station",
    final_price: 12000,
    status: "completed",
    completed_at: daysAgoAt(1, 20, 10),
  },
];

export const mockBids: MockBid[] = [
  {
    driver_name: "Ahmad K.",
    amount: 28000,
    status: "pending",
  },
  {
    driver_name: "Layla M.",
    amount: 32000,
    status: "pending",
  },
  {
    driver_name: "Omar S.",
    amount: 25000,
    status: "pending",
  },
];
