import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, likesTable, postsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router({ mergeParams: true });

async function getLikeCount(postId: number): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(likesTable)
    .where(eq(likesTable.postId, postId));
  return row?.value ?? 0;
}

router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const postId = Number(req.params.postId);

  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const post = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, postId))
    .limit(1);

  if (post.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  await db
    .insert(likesTable)
    .values({ postId, userClerkId: userId! })
    .onConflictDoNothing();

  const likeCount = await getLikeCount(postId);
  res.json({ liked: true, likeCount });
});

router.delete("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const postId = Number(req.params.postId);

  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  await db
    .delete(likesTable)
    .where(and(eq(likesTable.postId, postId), eq(likesTable.userClerkId, userId!)));

  const likeCount = await getLikeCount(postId);
  res.json({ liked: false, likeCount });
});

export default router;
