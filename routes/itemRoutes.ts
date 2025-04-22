import { Hono } from "hono";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createItem, getPostsFromUser,feed,getPostFromId, deletImage, updatePostParams } from "../controllers/itemController";
import { validator } from "../middlewares/validator";
const itemRoutes=new Hono();


itemRoutes.post('/post',authMiddleware,createItem);
itemRoutes.get('/postU',authMiddleware,getPostsFromUser);
itemRoutes.get('/feed',feed);
itemRoutes.get('/postI',getPostFromId);
itemRoutes.delete('/post',authMiddleware,deletImage);
itemRoutes.patch('/post',authMiddleware,updatePostParams);
itemRoutes.patch('/postImage',authMiddleware)
export default itemRoutes