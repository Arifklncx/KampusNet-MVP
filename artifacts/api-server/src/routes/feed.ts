import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, postsTable, usersTable, likesTable, commentsTable } from "@workspace/db";
import { desc, sql, eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  const [totalPostsRow] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(postsTable);

  const [totalUsersRow] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(usersTable);

  const [totalUniversitiesRow] = await db
    .select({ value: sql<number>`COUNT(DISTINCT university)::int` })
    .from(usersTable);

  const [postsTodayRow] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(postsTable)
    .where(sql`${postsTable.createdAt} >= NOW() - INTERVAL '24 hours'`);

  res.json({
    totalPosts: totalPostsRow?.value ?? 0,
    totalUsers: totalUsersRow?.value ?? 0,
    totalUniversities: totalUniversitiesRow?.value ?? 0,
    postsToday: postsTodayRow?.value ?? 0,
  });
});

router.get("/trending", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const trendingPosts = await db
    .select({ post: postsTable, likeCount: sql<number>`COUNT(likes.post_id)::int` })
    .from(postsTable)
    .leftJoin(likesTable, and(
      eq(likesTable.postId, postsTable.id),
      sql`likes.created_at >= NOW() - INTERVAL '24 hours'`
    ))
    .where(sql`${postsTable.createdAt} >= NOW() - INTERVAL '72 hours'`)
    .groupBy(postsTable.id)
    .orderBy(desc(sql`COUNT(likes.post_id)`), desc(postsTable.createdAt))
    .limit(10);

  const enriched = await Promise.all(
    trendingPosts.map(async ({ post, likeCount }) => {
      const author = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, post.authorClerkId))
        .limit(1);
      const a = author[0];

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
        likeCount: likeCount ?? 0,
        commentCount: commentRow?.value ?? 0,
        liked,
        createdAt: post.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

export default router;
