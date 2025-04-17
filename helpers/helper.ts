import {Readable} from "stream"
import cloudinary from "../database/init";

export function bufferToStream(buffer:Buffer):Readable{

    const stream= new Readable();
    stream.push(buffer);
    stream.push(null);

    return stream
}


export async function imageUploader(file:File) :Promise<any>{

    
    const arrayBuffer=await file.arrayBuffer();
    const buffer=Buffer.from(arrayBuffer);

    const uploader=await new Promise((res,rej)=>{
        const stream= cloudinary.uploader.upload_stream(
            {folder:'item-uploads'},
            (err,result)=>{
                if(err) rej(err);
                else res(result)
            }
        )
        bufferToStream(buffer).pipe(stream);
    })

    return uploader;

}

export async function deleteImage(publicId:string)  {
    
    try{
        const result=await cloudinary.uploader.destroy(publicId);
        return result;
    }
    catch(err:any){
        console.log(err);
    }

}


export  function extractPublicId(id:string | string[]) {

    let matches;
    const regex=/\/upload\/[^/]+\/(.*?)\.(jpg|jpeg|png|webp|gif)$/;
    if(!Array.isArray(id)){
        matches=id.match(regex);
        return matches ? matches[1] : null;
    }

    else{
        return id.map(url => {
            const matches = url.match(/\/upload\/[^/]+\/(.*?)\.(jpg|jpeg|png|webp|gif)$/);
            return matches ? matches[1] : null;
          });
    }

}