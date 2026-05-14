import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, notificationsTable, usersTable, postsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const rows = await db
    .select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      postId: notificationsTable.postId,
      read: notificationsTable.read,
      createdAt: notificationsTable.createdAt,
      actorFirstName: usersTable.firstName,
      actorLastName: usersTable.lastName,
      actorUniversity: usersTable.university,
      actorAvatarUrl: usersTable.avatarUrl,
      postContent: postsTable.content,
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(usersTable.clerkId, notificationsTable.actorClerkId))
    .leftJoin(postsTable, eq(postsTable.id, notificationsTable.postId))
    .where(eq(notificationsTable.recipientClerkId, userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const [unreadRow] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientClerkId, userId!),
      eq(notificationsTable.read, false)
    ));

  const notifications = rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorName: r.actorFirstName && r.actorLastName
      ? `${r.actorFirstName} ${r.actorLastName}`
      : "Bir kullanıcı",
    actorUniversity: r.actorUniversity ?? "",
    actorAvatarUrl: r.actorAvatarUrl ?? null,
    postId: r.postId,
    postContent: r.postContent ?? "",
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json({ notifications, unreadCount: unreadRow?.value ?? 0 });
});

router.put("/read-all", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(
      eq(notificationsTable.recipientClerkId, userId!),
      eq(notificationsTable.read, false)
    ));

  res.json({ success: true });
});

router.put("/:notificationId/read", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const notificationId = Number(req.params.notificationId);

  if (isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, notificationId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  if (rows[0].recipientClerkId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, notificationId));

  res.json({ success: true });
});

export default router;
