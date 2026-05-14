import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientClerkId: text("recipient_clerk_id").notNull(),
  actorClerkId: text("actor_clerk_id").notNull(),
  type: text("type").notNull(), // 'like' | 'comment'
  postId: integer("post_id").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
