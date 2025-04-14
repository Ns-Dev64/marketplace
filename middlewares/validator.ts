import type {Context,Next} from "hono"


export const validator=async(fields:string[])=>{

    return async (c:Context,next:Next)=>{
        const body=await c.req.json();

        for(const field of fields){
            if(!(field in body))
                return c.text('Missing Fields',401);
        }

        await next();
    }

}