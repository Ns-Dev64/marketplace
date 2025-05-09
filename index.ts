import { Hono } from "hono";
import { logger } from "hono/logger";
import {start} from "./start";
import userRouter from "./routes/userRoutes";
import itemRoutes from "./routes/itemRoutes";
import { wsAuthenticator } from "./ws/auth";
import { wsHandler } from "./ws/handler";
import chatRoutes from "./routes/chatRoutes";
const app=new Hono();

const instanceId=parseInt(Bun.env.WORKER_ID || "0");
const basePort=parseInt(Bun.env.PORT || "5001" );
const port=basePort+instanceId;

app.use(logger());
app.route('/api/v1/user',userRouter);
app.route('/api/v1/item',itemRoutes);
app.route('/api/v1/chat',chatRoutes);


Bun.serve({
    hostname:"localhost",
    port:port,
    async fetch(req,server){
        
        if(req.headers.get("upgrade")==="websocket"){
           const user =await wsAuthenticator(req);
            if(!user) return new Response("User auth failed please retry",{status:401});
            const upgraded:boolean=server.upgrade(req,{data:user});


            return upgraded ? undefined : new Response("Upgrade failed",{status:404})
        }

        return app.fetch(req)
    },
    websocket:wsHandler

})

start.startAll();