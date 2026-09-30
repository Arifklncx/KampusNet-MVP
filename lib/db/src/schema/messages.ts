import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderClerkId: text("sender_clerk_id").notNull(),
    recipientClerkId: text("recipient_clerk_id").notNull(),
    content: text("content").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_sender_recipient_created_idx").on(
      table.senderClerkId,
      table.recipientClerkId,
      table.createdAt,
    ),
    index("messages_recipient_read_idx").on(table.recipientClerkId, table.readAt),
  ],
);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  readAt: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DirectMessageRow = typeof messagesTable.$inferSelect;