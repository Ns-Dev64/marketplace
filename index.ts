import { Hono } from "hono";
import { logger } from "hono/logger";
import {start} from "./start";
import userRouter from "./routes/userRoutes";
import itemRoutes from "./routes/itemRoutes";
const app=new Hono();

app.use(logger());
app.route('/api/v1/user',userRouter);
app.route('/api/v1/item',itemRoutes);
Bun.serve({
    port:process.env.PORT,
    fetch:app.fetch
})

start.startAll();