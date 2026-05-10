import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, postsTable, usersTable, likesTable } from "@workspace/db";
import { desc, sql, eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  const [totalPostsRow] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) as count FROM posts`
  );
  const [totalUsersRow] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) as count FROM users`
  );
  const [totalUniversitiesRow] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(DISTINCT university) as count FROM users`
  );
  const [postsTodayRow] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) as count FROM posts WHERE created_at >= NOW() - INTERVAL '24 hours'`
  );

  res.json({
    totalPosts: parseInt(totalPostsRow.count ?? "0", 10),
    totalUsers: parseInt(totalUsersRow.count ?? "0", 10),
    totalUniversities: parseInt(totalUniversitiesRow.count ?? "0", 10),
    postsToday: parseInt(postsTodayRow.count ?? "0", 10),
  });
});

router.get("/trending", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const trendingPosts = await db
    .select({ post: postsTable, likeCount: sql<number>`COUNT(likes.post_id)` })
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
    trendingPosts.map(async ({ post }) => {
      const author = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, post.authorClerkId))
        .limit(1);
      const a = author[0];

      const [likeRow] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*) as count FROM likes WHERE post_id = ${post.id}`
      );
      const [commentRow] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*) as count FROM comments WHERE post_id = ${post.id}`
      );

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
        likeCount: parseInt(likeRow.count ?? "0", 10),
        commentCount: parseInt(commentRow.count ?? "0", 10),
        liked,
        createdAt: post.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

export default router;
