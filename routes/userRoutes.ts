import { Hono } from "hono";
import { registerHandler,loginHandler,status,getUser } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validator } from "../middlewares/validator";
const userRouter=new Hono();



userRouter.post('/register',validator(['email','password','userName']),registerHandler);
userRouter.post('/login',validator(['identifier','password']),loginHandler);
userRouter.get('/status',authMiddleware,status);
userRouter.get("/get",authMiddleware,getUser);

export default userRouter