import { Hono } from "hono";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createItem, getPostsFromUser,feed,getPostFromId } from "../controllers/itemController";
import { validator } from "../middlewares/validator";
const itemRoutes=new Hono();


itemRoutes.post('/post',authMiddleware,createItem);
itemRoutes.get('/get',authMiddleware,getPostsFromUser);
itemRoutes.get('/feed',feed)
itemRoutes.get('/getI',getPostFromId)
export default itemRoutes