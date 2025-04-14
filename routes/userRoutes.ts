import { Hono } from "hono";

const userRouter=new Hono();



userRouter.post('/register');
userRouter.post('/login');
userRouter.get('/status');
userRouter.get('/user');
