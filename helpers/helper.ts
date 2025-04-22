import {Readable} from "stream"
import cloudinary from "../database/init";
import { createHash } from "crypto";

const regex=/\/upload\/[^/]+\/(.*?)\.(jpg|jpeg|png|webp|gif)$/;

export function bufferToStream(buffer:Buffer):Readable{

    const stream= new Readable();
    stream.push(buffer);
    stream.push(null);

    return stream
}


export async function imageUploader(file:File,parent:string) :Promise<any>{

    
    const arrayBuffer=await file.arrayBuffer();
    const buffer=Buffer.from(arrayBuffer);

    const uploader=await new Promise((res,rej)=>{
        const stream= cloudinary.uploader.upload_stream(
            {folder:`${parent}-uploads/item-uploads`},
            (err,result)=>{
                if(err) rej(err);
                else res(result)
            }
        )
        bufferToStream(buffer).pipe(stream);
    })

    return uploader;

}

export async function deleteImage(publicId:string )  {
    
    try{
        const result=await cloudinary.uploader.destroy(publicId);
        return result;
    }
    catch(err:any){
        console.log(err);
    }

}

export function isoTimeString() :string {
    return new Date().toISOString()
}

  function extractPublicId(id:string)  {
    let matches;
        matches=id.match(regex);
        return matches ? matches[1] : null; 
}


 function extractPublicIds(ids:String[]){

    let matches;
    return ids.map(item=>{
        matches=item.match(regex);
        return matches ? matches[1]:null
    })

}

export function isSamePublicId(url:string,publicId:string){
    return extractPublicId(url)===publicId;
}

