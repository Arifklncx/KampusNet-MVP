import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, postsTable, usersTable, likesTable, commentsTable } from "@workspace/db";
import { ilike, or, sql, desc, eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const q = String(req.query.q ?? "").trim();

  if (!q) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  const pattern = `%${q}%`;

  const [userRows, postRows] = await Promise.all([
    db
      .select({
        clerkId: usersTable.clerkId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        university: usersTable.university,
        department: usersTable.department,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(
        or(
          ilike(sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`, pattern),
          ilike(usersTable.university, pattern),
          ilike(usersTable.department, pattern),
        )
      )
      .limit(6),

    db
      .select()
      .from(postsTable)
      .where(ilike(postsTable.content, pattern))
      .orderBy(desc(postsTable.createdAt))
      .limit(5),
  ]);

  const enrichedPosts = await Promise.all(
    postRows.map(async (post) => {
      const author = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, post.authorClerkId))
        .limit(1);
      const a = author[0];

      const [likeRow] = await db
        .select({ value: sql<number>`COUNT(*)::int` })
        .from(likesTable)
        .where(eq(likesTable.postId, post.id));

      const [commentRow] = await db
        .select({ value: sql<number>`COUNT(*)::int` })
        .from(commentsTable)
        .where(eq(commentsTable.postId, post.id));

      let liked = false;
      if (userId) {
        const likeCheck = await db
          .select()
          .from(likesTable)
          .where(and(eq(likesTable.postId, post.id), eq(likesTable.userClerkId, userId)))
          .limit(1);
        liked = likeCheck.length > 0;
      }

      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl ?? null,
        authorId: post.authorClerkId,
        authorName: a ? `${a.firstName} ${a.lastName}` : "Unknown",
        authorUniversity: a?.university ?? "Unknown",
        authorDepartment: a?.department ?? "",
        authorAvatarUrl: a?.avatarUrl ?? null,
        likeCount: likeRow?.value ?? 0,
        commentCount: commentRow?.value ?? 0,
        liked,
        createdAt: post.createdAt.toISOString(),
      };
    })
  );

  res.json({ posts: enrichedPosts, users: userRows });
});

export default router;
