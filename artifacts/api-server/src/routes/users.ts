import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, postsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  UpsertMyProfileBody,
  GetUserProfileParams,
} from "@workspace/api-zod";

const router = Router();

async function getPostCount(clerkId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(postsTable)
    .where(eq(postsTable.authorClerkId, clerkId));
  return row?.value ?? 0;
}

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId!))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const user = rows[0];
  const postCount = await getPostCount(userId!);

  res.json({
    ...user,
    postCount,
    followerCount: 0,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = UpsertMyProfileBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { firstName, lastName, university, department, year, bio, avatarUrl } = parsed.data;

  const clerkClient = req.app.locals.clerkClient;
  let email = "";

  try {
    const clerkUser = await (clerkClient?.users?.getUser(userId!) ?? Promise.resolve(null));
    email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  } catch {
    email = `${userId}@unknown.edu.tr`;
  }

  if (email && !email.endsWith(".edu.tr")) {
    res.status(400).json({ error: "Only .edu.tr email addresses are allowed" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId!))
    .limit(1);

  let user;
  if (existing.length === 0) {
    const inserted = await db
      .insert(usersTable)
      .values({
        clerkId: userId!,
        email: email || `${userId}@unknown.edu.tr`,
        firstName,
        lastName,
        university,
        department,
        year,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      })
      .returning();
    user = inserted[0];
  } else {
    const updated = await db
      .update(usersTable)
      .set({
        firstName,
        lastName,
        university,
        department,
        year,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      })
      .where(eq(usersTable.clerkId, userId!))
      .returning();
    user = updated[0];
  }

  const postCount = await getPostCount(userId!);

  res.json({
    ...user,
    postCount,
    followerCount: 0,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/:userId", async (req, res) => {
  const parsed = GetUserProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, parsed.data.userId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = rows[0];
  const postCount = await getPostCount(parsed.data.userId);

  res.json({
    ...user,
    postCount,
    followerCount: 0,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
