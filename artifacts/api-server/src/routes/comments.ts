import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, commentsTable, usersTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateCommentBody } from "@workspace/api-zod";

const commentsRouter = Router({ mergeParams: true });
const singleCommentRouter = Router();

commentsRouter.get("/", async (req, res) => {
  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (post.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, postId))
    .orderBy(asc(commentsTable.createdAt));

  const enriched = await Promise.all(
    comments.map(async (c) => {
      const author = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, c.authorClerkId))
        .limit(1);
      const a = author[0];
      return {
        id: c.id,
        content: c.content,
        postId: c.postId,
        authorId: c.authorClerkId,
        authorName: a ? `${a.firstName} ${a.lastName}` : "Unknown",
        authorUniversity: a?.university ?? "Unknown",
        authorAvatarUrl: a?.avatarUrl ?? null,
        createdAt: c.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

commentsRouter.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const postId = Number(req.params.postId);

  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (post.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const inserted = await db
    .insert(commentsTable)
    .values({
      content: parsed.data.content,
      postId,
      authorClerkId: userId!,
    })
    .returning();

  if (post[0].authorClerkId !== userId) {
    await db.insert(notificationsTable).values({
      recipientClerkId: post[0].authorClerkId,
      actorClerkId: userId!,
      type: "comment",
      postId,
    });
  }

  const c = inserted[0];
  const author = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId!))
    .limit(1);
  const a = author[0];

  res.status(201).json({
    id: c.id,
    content: c.content,
    postId: c.postId,
    authorId: c.authorClerkId,
    authorName: a ? `${a.firstName} ${a.lastName}` : "Unknown",
    authorUniversity: a?.university ?? "Unknown",
    authorAvatarUrl: a?.avatarUrl ?? null,
    createdAt: c.createdAt.toISOString(),
  });
});

singleCommentRouter.delete("/:commentId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const commentId = Number(req.params.commentId);

  if (isNaN(commentId)) {
    res.status(400).json({ error: "Invalid comment ID" });
    return;
  }

  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.id, commentId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (rows[0].authorClerkId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.status(204).send();
});

export { commentsRouter, singleCommentRouter };
