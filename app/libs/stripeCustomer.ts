import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";

/**
 * The guest-side Stripe Customer, created lazily. Used so a card entered at
 * checkout is saved and can be reused for the next booking or a trip extension.
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true },
  });
  if (!user) return null;
  if (user.stripeCustomerId) return user.stripeCustomerId;

  try {
    const customer = await getStripe().customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { redriveUserId: userId },
    });
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
    return customer.id;
  } catch (error) {
    console.error("Stripe customer create failed", userId, error);
    return null;
  }
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export async function listSavedCards(customerId: string): Promise<SavedCard[]> {
  try {
    const methods = await getStripe().paymentMethods.list({ customer: customerId, type: "card", limit: 5 });
    return methods.data
      .filter((method) => method.card)
      .map((method) => ({
        id: method.id,
        brand: method.card!.brand,
        last4: method.card!.last4,
        expMonth: method.card!.exp_month,
        expYear: method.card!.exp_year,
      }));
  } catch (error) {
    console.error("Stripe payment-methods list failed", error);
    return [];
  }
}
