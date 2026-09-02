import prisma from "@/app/libs/prismadb";

/**
 * Drop an app-authored line into the 1:1 chat between two booking parties —
 * the place the product tells people to coordinate handovers. Finds the
 * existing chat or creates it. `actorId` is recorded as the sender (so reads
 * and permissions still work) but the message is flagged `system` and the UI
 * renders it as a centred note regardless of who "sent" it.
 *
 * Best-effort: never throws into the caller.
 */
export async function postBookingSystemMessage(
  participantAId: string,
  participantBId: string,
  text: string,
  actorId: string,
): Promise<void> {
  try {
    const pair = [participantAId, participantBId];
    let chat = await prisma.chat.findFirst({
      where: { participantIds: { hasEvery: pair } },
      select: { id: true },
    });
    if (!chat) {
      chat = await prisma.chat.create({
        data: { participantIds: pair },
        select: { id: true },
      });
    }
    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: actorId,
        text: text.slice(0, 2000),
        system: true,
        readByIds: [actorId],
      },
    });
    await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }); // inbox sort
  } catch (error) {
    console.error("postBookingSystemMessage failed", error);
  }
}
