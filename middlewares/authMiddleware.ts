import { verify } from "hono/jwt";
import type { Context,Next } from "hono";
import { getString } from "../database/operations";

export const authMiddleware=async(c:Context,next:Next)=>{
    const authHeader=c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.text('Unauthorized', 401);
    }

    const token=authHeader.split(' ')[1]!,
    payload= await verify(token,process.env.JWT_SECRET || "");
    const session=await getString(`session:${payload.id}`);

    if(!session || session !==token)
        return c.text('Invalid session',401);
    
    c.set('jwtPayload',payload);
    await next();
}

