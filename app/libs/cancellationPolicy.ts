export const CANCELLATION_POLICY_VERSION = "2026-08-23";

export type CancellationPolicyKey = "FLEXIBLE" | "MODERATE" | "FIRM";

export type CancellationPolicyDefinition = {
  key: CancellationPolicyKey;
  name: string;
  shortDescription: string;
  guestSummary: string;
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercentage: number;
};

export const CANCELLATION_POLICIES: CancellationPolicyDefinition[] = [
  {
    key: "FLEXIBLE",
    name: "Flexible",
    shortDescription: "Best for guests who value flexibility.",
    guestSummary: "Full refund until 24 hours before pickup; 50% after that and before pickup.",
    fullRefundHours: 24,
    partialRefundHours: 0,
    partialRefundPercentage: 50,
  },
  {
    key: "MODERATE",
    name: "Moderate",
    shortDescription: "A balanced default for most vehicles.",
    guestSummary: "Full refund until 5 days before pickup; 50% until 48 hours before pickup.",
    fullRefundHours: 120,
    partialRefundHours: 48,
    partialRefundPercentage: 50,
  },
  {
    key: "FIRM",
    name: "Firm",
    shortDescription: "More protection for hosts with harder-to-fill dates.",
    guestSummary: "Full refund until 14 days before pickup; 50% until 7 days before pickup.",
    fullRefundHours: 336,
    partialRefundHours: 168,
    partialRefundPercentage: 50,
  },
];

export function normalizeCancellationPolicy(value: unknown): CancellationPolicyKey {
  const key = typeof value === "string" ? value.toUpperCase() : "";
  return CANCELLATION_POLICIES.some((policy) => policy.key === key)
    ? key as CancellationPolicyKey
    : "MODERATE";
}

export function getCancellationPolicy(value: unknown) {
  const key = normalizeCancellationPolicy(value);
  return CANCELLATION_POLICIES.find((policy) => policy.key === key)!;
}

export function cancellationPolicySnapshot(value: unknown) {
  const policy = getCancellationPolicy(value);
  return { ...policy, version: CANCELLATION_POLICY_VERSION };
}

export function calculateCancellationOutcome(input: {
  policy: unknown;
  pickupAt: Date | string;
  cancelledAt?: Date;
  cancelledByHost?: boolean;
}) {
  const policy = getCancellationPolicy(input.policy);
  const pickupAt = new Date(input.pickupAt);
  const cancelledAt = input.cancelledAt || new Date();
  const hoursBeforePickup = (pickupAt.getTime() - cancelledAt.getTime()) / 3_600_000;

  if (!Number.isFinite(hoursBeforePickup) || hoursBeforePickup <= 0) {
    return {
      canCancel: false,
      refundPercentage: 0,
      hoursBeforePickup,
      policy,
      explanation: "This booking has already started and must be handled through trip support.",
    };
  }

  if (input.cancelledByHost) {
    return {
      canCancel: true,
      refundPercentage: 100,
      hoursBeforePickup,
      policy,
      explanation: "Host cancellations receive a full refund of the amount paid through Redrive.",
    };
  }

  if (hoursBeforePickup >= policy.fullRefundHours) {
    return {
      canCancel: true,
      refundPercentage: 100,
      hoursBeforePickup,
      policy,
      explanation: `This cancellation is inside the ${policy.name.toLowerCase()} policy’s full-refund window.`,
    };
  }

  if (hoursBeforePickup >= policy.partialRefundHours) {
    return {
      canCancel: true,
      refundPercentage: policy.partialRefundPercentage,
      hoursBeforePickup,
      policy,
      explanation: `${policy.partialRefundPercentage}% of the amount paid through Redrive is refundable at this point.`,
    };
  }

  return {
    canCancel: true,
    refundPercentage: 0,
    hoursBeforePickup,
    policy,
    explanation: "The free and partial-refund windows have passed. You may still cancel, but no automatic refund is due under this policy.",
  };
}

export function cancellationExample(value: unknown) {
  const policy = getCancellationPolicy(value);
  if (policy.key === "FLEXIBLE") return "Example: cancelling an upcoming 1 September pickup on 29 August receives a full refund.";
  if (policy.key === "MODERATE") return "Example: cancelling an upcoming 1 September pickup on 29 August receives a 50% refund.";
  return "Example: cancelling an upcoming 1 September pickup on 29 August falls outside the refund window.";
}
