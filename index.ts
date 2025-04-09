import { Hono } from "hono";


const app=new Hono();




app.use()

Bun.serve({
    port:5001,
    fetch:app.fetch
})