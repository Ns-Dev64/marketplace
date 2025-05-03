import { Hono } from "hono";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createRoomController } from "../ws/chat.api";
import { validator } from "../middlewares/validator";
const chatRoutes=new Hono();

chatRoutes.post('/room/create',validator(["name","userIds"]),createRoomController);

export default chatRoutes;