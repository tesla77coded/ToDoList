
import supabase from './supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

export const uploadFileToSupabase = async (fileBuffer, fileName, bucket) => {
  const fileExt = fileName.split('.').pop();
  const uniqueName = `${uuidv4()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uniqueName, fileBuffer, {
      contentType: getContentType(fileExt),
      upsert: false,
    });

  if (error) {
    throw new Error('File upload failed: ' + error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueName);

  return publicUrlData.publicUrl;
};

const getContentType = (ext) => {
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};
