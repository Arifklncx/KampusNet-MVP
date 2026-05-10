import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import postsRouter from "./posts";
import likesRouter from "./likes";
import feedRouter from "./feed";
import { commentsRouter, singleCommentRouter } from "./comments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/posts/:postId/like", likesRouter);
router.use("/posts/:postId/comments", commentsRouter);
router.use("/comments", singleCommentRouter);
router.use("/feed", feedRouter);

export default router;
