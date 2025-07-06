import supabase from "./supabaseClient.js";
import { v4 as uuidv4 } from 'uuid';

export const uploadFileToSupabase = async (fileBuffer, fileName, folder) => {

  const fileExt = fileName.split('.').pop();
  const uniqueName = `${folder}/${uuidv4()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('task-assets')
    .upload(uniqueName, fileBuffer, {
      contentType: getContentType(fileExt),
      upsert: false,
    });

  if (error) {
    throw new Error('File upload failed: ' + error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from('task-assets')
    .getPublicUrl(uniqueName);

  return publicUrlData.publicUrl;

};


const getContentType = (ext) => {
  const map = {
    jpg: 'img/jpeg',
    jpeg: 'img/jpeg',
    png: 'img/png',
    webp: 'img/webp',
    mp3: 'audio/mp3',
    wav: 'audio/wav',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';

}
