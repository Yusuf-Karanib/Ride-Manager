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
