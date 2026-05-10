import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, postsTable, usersTable, likesTable, commentsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  GetPostsQueryParams,
  GetPostParams,
  DeletePostParams,
  CreatePostBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, viewerClerkId: string | null) {
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
  if (viewerClerkId) {
    const likeCheck = await db
      .select()
      .from(likesTable)
      .where(and(eq(likesTable.postId, post.id), eq(likesTable.userClerkId, viewerClerkId)))
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
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = GetPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { filter, limit = 20, offset = 0 } = parsed.data;

  let posts: (typeof postsTable.$inferSelect)[] = [];
  let total = 0;

  if (filter === "my_university") {
    const myUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId!))
      .limit(1);

    if (myUser.length === 0) {
      res.json({ posts: [], total: 0 });
      return;
    }

    const university = myUser[0].university;

    const universityUsers = await db
      .select({ clerkId: usersTable.clerkId })
      .from(usersTable)
      .where(eq(usersTable.university, university));

    const clerkIds = universityUsers.map((u) => u.clerkId);

    if (clerkIds.length === 0) {
      res.json({ posts: [], total: 0 });
      return;
    }

    const allPosts = await db
      .select()
      .from(postsTable)
      .where(sql`${postsTable.authorClerkId} = ANY(${sql.raw(`ARRAY[${clerkIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit!)
      .offset(offset!);

    const [countRow] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM posts WHERE author_clerk_id = ANY(${sql.raw(`ARRAY[${clerkIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]::text[]`)})`
    );

    posts = allPosts;
    total = parseInt(countRow.count ?? "0", 10);
  } else {
    const allPosts = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit!)
      .offset(offset!);

    const [countRow] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM posts`
    );

    posts = allPosts;
    total = parseInt(countRow.count ?? "0", 10);
  }

  const enriched = await Promise.all(posts.map((p) => enrichPost(p, userId!)));
  res.json({ posts: enriched, total });
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const inserted = await db
    .insert(postsTable)
    .values({
      content: parsed.data.content,
      imageUrl: parsed.data.imageUrl ?? null,
      authorClerkId: userId!,
    })
    .returning();

  const post = inserted[0];
  const enriched = await enrichPost(post, userId!);
  res.status(201).json(enriched);
});

router.get("/:postId", async (req, res) => {
  const parsed = GetPostParams.safeParse({ postId: Number(req.params.postId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const rows = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, parsed.data.postId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const enriched = await enrichPost(rows[0], null);
  res.json(enriched);
});

router.delete("/:postId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = DeletePostParams.safeParse({ postId: Number(req.params.postId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const rows = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, parsed.data.postId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (rows[0].authorClerkId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, parsed.data.postId));
  res.status(204).send();
});

export default router;
