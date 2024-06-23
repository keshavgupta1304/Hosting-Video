import Router from "express"
import { verifyJWT } from "../middlewares/auth.middleware"
const router=Router()

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);
export default router

