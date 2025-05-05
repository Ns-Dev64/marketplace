import { Hono } from "hono";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createRoomController, deleteRoomApi, getChatsApi } from "../ws/chat.api";
import { validator } from "../middlewares/validator";
import { getRoomUsers,updateRoomApi } from "../ws/chat.api";
const chatRoutes=new Hono();

chatRoutes.post('/room/create',validator(["name","userIds"]),createRoomController);
chatRoutes.get('/room/users',getRoomUsers);
chatRoutes.patch('/room/update',updateRoomApi);
chatRoutes.delete('/room/delete',deleteRoomApi);
chatRoutes.get('/get',getChatsApi);
export default chatRoutes;