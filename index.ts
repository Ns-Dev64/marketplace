import { Hono } from "hono";
import { logger } from "hono/logger";
import {start} from "./start";

const app=new Hono();

app.use(logger());

Bun.serve({
    port:process.env.PORT,
    fetch:app.fetch
})

start.startAll();