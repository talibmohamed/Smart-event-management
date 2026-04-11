import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const bucketName = process.env.SUPABASE_EVENT_IMAGES_BUCKET || "event-images";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to set up storage."
  );
  process.exit(1);
}

if (serviceRoleKey.includes("replace-with")) {
  console.error("SUPABASE_SERVICE_ROLE_KEY must be replaced with the real key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data: buckets, error: listError } =
  await supabase.storage.listBuckets();

if (listError) {
  console.error("Could not list Supabase Storage buckets:", listError.message);
  process.exit(1);
}

const existingBucket = buckets.find((bucket) => bucket.name === bucketName);

if (!existingBucket) {
  const { error: createError } = await supabase.storage.createBucket(
    bucketName,
    {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
    }
  );

  if (createError) {
    console.error("Could not create event image bucket:", createError.message);
    process.exit(1);
  }

  console.log(`Created public Supabase Storage bucket: ${bucketName}`);
} else {
  const { error: updateError } = await supabase.storage.updateBucket(
    bucketName,
    {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
    }
  );

  if (updateError) {
    console.error("Could not update event image bucket:", updateError.message);
    process.exit(1);
  }

  console.log(`Supabase Storage bucket is ready: ${bucketName}`);
}

