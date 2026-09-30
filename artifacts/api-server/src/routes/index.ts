import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import postsRouter from "./posts";
import likesRouter from "./likes";
import feedRouter from "./feed";
import notificationsRouter from "./notifications";
import searchRouter from "./search";
import { commentsRouter, singleCommentRouter } from "./comments";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/posts/:postId/like", likesRouter);
router.use("/posts/:postId/comments", commentsRouter);
router.use("/comments", singleCommentRouter);
router.use("/feed", feedRouter);
router.use("/notifications", notificationsRouter);
router.use("/search", searchRouter);
router.use("/messages", messagesRouter);

export default router;
