import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const likesTable = pgTable("likes", {
  postId: integer("post_id").notNull(),
  userClerkId: text("user_clerk_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userClerkId] }),
}));

export type Like = typeof likesTable.$inferSelect;
