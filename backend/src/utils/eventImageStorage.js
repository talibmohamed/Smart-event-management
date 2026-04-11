import "dotenv/config";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "event-images";

const extensionByMimeType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

let supabaseClient;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage environment variables are not set.");
  }

  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}

function getBucketName() {
  return process.env.SUPABASE_EVENT_IMAGES_BUCKET || DEFAULT_BUCKET;
}

export async function uploadEventImage(file, userId) {
  const supabase = getSupabaseClient();
  const bucketName = getBucketName();
  const extension = extensionByMimeType[file.mimetype];
  const imagePath = `events/${userId}/${Date.now()}-${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(imagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(imagePath);

  return {
    image_url: data.publicUrl,
    image_path: imagePath
  };
}

export async function deleteEventImage(imagePath) {
  if (!imagePath) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    await supabase.storage.from(getBucketName()).remove([imagePath]);
  } catch {
    // Image cleanup is best-effort and must not break event operations.
  }
}
