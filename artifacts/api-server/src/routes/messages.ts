import { Router } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db, messagesTable, usersTable } from "@workspace/db";
import {
  GetConversationsResponse,
  GetConversationMessagesParams,
  GetConversationMessagesResponse,
  GetConversationMessagesResponseItem,
  SendDirectMessageParams,
  SendDirectMessageBody,
  MarkConversationReadParams,
  MarkConversationReadResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function toDirectMessage(message: typeof messagesTable.$inferSelect) {
  return {
    id: message.id,
    senderId: message.senderClerkId,
    recipientId: message.recipientClerkId,
    content: message.content,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

async function findProfile(userId: string) {
  const [profile] = await db
    .select({
      clerkId: usersTable.clerkId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      university: usersTable.university,
      department: usersTable.department,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId))
    .limit(1);
  return profile;
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.senderClerkId, userId!), eq(messagesTable.recipientClerkId, userId!)))
    .orderBy(desc(messagesTable.createdAt));

  const counterpartIds = Array.from(
    new Set(
      messages.map((message) =>
        message.senderClerkId === userId ? message.recipientClerkId : message.senderClerkId,
      ),
    ),
  );
  if (counterpartIds.length === 0) {
    res.json(GetConversationsResponse.parse([]));
    return;
  }

  const profiles = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.clerkId, counterpartIds));
  const profilesById = new Map(profiles.map((profile) => [profile.clerkId, profile]));
  const conversations = new Map<
    string,
    {
      profile: (typeof profiles)[number];
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }
  >();

  for (const message of messages) {
    const otherUserId =
      message.senderClerkId === userId ? message.recipientClerkId : message.senderClerkId;
    const profile = profilesById.get(otherUserId);
    if (!profile) continue;

    const conversation = conversations.get(otherUserId);
    if (!conversation) {
      conversations.set(otherUserId, {
        profile,
        lastMessage: message.content,
        lastMessageAt: message.createdAt.toISOString(),
        unreadCount:
          message.recipientClerkId === userId && message.readAt === null ? 1 : 0,
      });
    } else if (message.recipientClerkId === userId && message.readAt === null) {
      conversation.unreadCount += 1;
    }
  }

  const result = Array.from(conversations.entries()).map(([otherUserId, conversation]) => ({
    userId: otherUserId,
    firstName: conversation.profile.firstName,
    lastName: conversation.profile.lastName,
    university: conversation.profile.university,
    department: conversation.profile.department,
    avatarUrl: conversation.profile.avatarUrl,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: conversation.unreadCount,
  }));

  res.json(GetConversationsResponse.parse(result));
});

router.get("/:userId", requireAuth, async (req, res): Promise<void> => {
  const { userId: currentUserId } = getAuth(req);
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const otherUserId = params.data.userId;
  if (otherUserId === currentUserId) {
    res.status(400).json({ error: "Cannot open a conversation with yourself" });
    return;
  }
  if (!(await findProfile(otherUserId))) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(
          eq(messagesTable.senderClerkId, currentUserId!),
          eq(messagesTable.recipientClerkId, otherUserId),
        ),
        and(
          eq(messagesTable.senderClerkId, otherUserId),
          eq(messagesTable.recipientClerkId, currentUserId!),
        ),
      ),
    )
    .orderBy(messagesTable.createdAt);

  res.json(GetConversationMessagesResponse.parse(messages.map(toDirectMessage)));
});

router.post("/:userId", requireAuth, async (req, res): Promise<void> => {
  const { userId: senderId } = getAuth(req);
  const params = SendDirectMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const body = SendDirectMessageBody.safeParse(req.body);
  if (!body.success || !body.data.content.trim()) {
    res.status(400).json({ error: "Message must contain text" });
    return;
  }

  const recipientId = params.data.userId;
  if (recipientId === senderId) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }
  if (!(await findProfile(recipientId))) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      senderClerkId: senderId!,
      recipientClerkId: recipientId,
      content: body.data.content.trim(),
    })
    .returning();

  res.status(201).json(GetConversationMessagesResponseItem.parse(toDirectMessage(message)));
});

router.put("/:userId/read", requireAuth, async (req, res): Promise<void> => {
  const { userId: currentUserId } = getAuth(req);
  const params = MarkConversationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const otherUserId = params.data.userId;
  if (!(await findProfile(otherUserId))) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.senderClerkId, otherUserId),
        eq(messagesTable.recipientClerkId, currentUserId!),
        isNull(messagesTable.readAt),
      ),
    );

  res.json(MarkConversationReadResponse.parse({ success: true }));
});

export default router;