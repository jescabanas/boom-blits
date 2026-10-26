import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-firebase-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bucketName = "project-documents";
const firebaseProjectId = "barangay-tracker-1b869";
const maxFileSize = 10 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseSecretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const newKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!newKeys) throw new Error("Supabase server key is unavailable.");

  const keys = JSON.parse(newKeys);
  const firstKey = Object.values(keys)[0];
  if (!firstKey || typeof firstKey !== "string") {
    throw new Error("Supabase server key is unavailable.");
  }
  return firstKey;
}

function getFirebaseUserId(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Firebase token.");

  const payload = JSON.parse(
    atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
  );
  const userId = payload.user_id || payload.sub;
  if (!userId || typeof userId !== "string") {
    throw new Error("Firebase user ID is unavailable.");
  }
  return userId;
}

function getFirestoreString(
  fields: Record<string, unknown>,
  fieldName: string,
) {
  const field = fields?.[fieldName] as { stringValue?: string };
  return String(field?.stringValue || "").trim();
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

function isAllowedDocument(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "doc", "docx"].includes(extension || "");
}

function isAllowedCitizenDocument(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "jpg", "jpeg", "png"].includes(extension || "");
}

function isAllowedFeedbackImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].includes(extension || "") &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase());
}

async function getFirebaseProfile(token: string) {
  const userId = getFirebaseUserId(token);
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    throw new Error("Your Firebase login could not be verified.");
  }

  const profile = await response.json();
  const fields = profile.fields || {};
  return {
    uid: userId,
    role: getFirestoreString(fields, "role").toLowerCase(),
    barangayId: getFirestoreString(fields, "barangayId"),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const firebaseToken = request.headers.get("x-firebase-token") || "";
    if (!firebaseToken) {
      return jsonResponse({ error: "Please sign in first." }, 401);
    }

    const profile = await getFirebaseProfile(firebaseToken);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabase = createClient(supabaseUrl, getSupabaseSecretKey());
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const action = String(formData.get("action") || "");

      if (action === "upload-feedback-images") {
        if (profile.role !== "citizen" || !profile.barangayId) {
          return jsonResponse({ error: "Only signed-in citizens can attach feedback images." }, 403);
        }

        const projectId = String(formData.get("projectId") || "").trim();
        const files = formData.getAll("files").filter((file): file is File => file instanceof File);
        if (!projectId || projectId.includes("/") || files.length < 1 || files.length > 5) {
          return jsonResponse({ error: "Choose between 1 and 5 feedback images for a valid project." }, 400);
        }

        const projectResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/projects/${encodeURIComponent(projectId)}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } },
        );
        if (!projectResponse.ok) {
          return jsonResponse({ error: "The selected project could not be verified." }, 403);
        }
        const projectRecord = await projectResponse.json();
        if (getFirestoreString(projectRecord.fields || {}, "barangayId") !== profile.barangayId) {
          return jsonResponse({ error: "You can attach images only to projects in your barangay." }, 403);
        }

        for (const file of files) {
          if (!isAllowedFeedbackImage(file)) {
            return jsonResponse({ error: "Feedback images must be JPG, PNG, or WEBP files." }, 400);
          }
          if (file.size > maxFileSize) {
            return jsonResponse({ error: "Each feedback image must not exceed 10 MB." }, 400);
          }
        }

        const uploadedPaths: string[] = [];
        try {
          const documents: Record<string, unknown>[] = [];
          for (const file of files) {
            const storagePath = `${profile.barangayId}/feedback/${profile.uid}/${projectId}-${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
            const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });
            if (uploadError) throw uploadError;
            uploadedPaths.push(storagePath);
            documents.push({ name: file.name, type: file.type, size: file.size, storagePath });
          }
          return jsonResponse({ success: true, documents });
        } catch (error) {
          if (uploadedPaths.length) await supabase.storage.from(bucketName).remove(uploadedPaths);
          throw error;
        }
      }

      if (action === "upload-citizen-verification") {
        if (profile.role !== "citizen" || !profile.barangayId) {
          return jsonResponse({ error: "Only signed-in citizens can upload verification files." }, 403);
        }

        const barangayProof = formData.get("barangayProof");
        if (!(barangayProof instanceof File)) {
          return jsonResponse({ error: "Barangay proof or a valid ID is required." }, 400);
        }

        for (const file of [barangayProof]) {
          if (!isAllowedCitizenDocument(file)) {
            return jsonResponse({ error: "Verification files must be PDF, JPG, JPEG, or PNG." }, 400);
          }
          if (file.size > maxFileSize) {
            return jsonResponse({ error: "The verification file must not exceed 10 MB." }, 400);
          }
        }

        const uploadedPaths: string[] = [];
        try {
          const documents: Record<string, unknown> = {};
          for (const [kind, file] of [["barangayProof", barangayProof]] as const) {
            const storagePath = `${profile.barangayId}/citizens/${profile.uid}/${kind}-${Date.now()}-${sanitizeFileName(file.name)}`;
            const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
            if (uploadError) throw uploadError;
            uploadedPaths.push(storagePath);
            documents[kind] = { name: file.name, type: file.type || "Document", size: file.size, storagePath };
          }
          return jsonResponse({ success: true, documents });
        } catch (error) {
          if (uploadedPaths.length) await supabase.storage.from(bucketName).remove(uploadedPaths);
          throw error;
        }
      }

      const isDilgProjectUpload = profile.role === "dilg";
      if (profile.role !== "barangay" && !isDilgProjectUpload) {
        return jsonResponse(
          { error: "Only Barangay staff or DILG can upload project documents." },
          403,
        );
      }

      const targetBarangayId = isDilgProjectUpload
        ? String(formData.get("barangayId") || "").trim()
        : profile.barangayId;

      if (!targetBarangayId) {
        return jsonResponse({ error: "Barangay ID is missing." }, 403);
      }
      if (isDilgProjectUpload && !/^[a-zA-Z0-9_-]+$/.test(targetBarangayId)) {
        return jsonResponse({ error: "Barangay ID is invalid." }, 400);
      }

      const file = formData.get("file");

      if (action !== "upload" || !(file instanceof File)) {
        return jsonResponse({ error: "No document was selected." }, 400);
      }
      if (!isAllowedDocument(file)) {
        return jsonResponse(
          { error: "Only PDF, DOC, and DOCX files are allowed." },
          400,
        );
      }
      if (file.size > maxFileSize) {
        return jsonResponse(
          { error: "The document must not exceed 10 MB." },
          400,
        );
      }

      const uploaderFolder = isDilgProjectUpload ? `dilg/${profile.uid}` : profile.uid;
      const storagePath = `${targetBarangayId}/${uploaderFolder}/` +
        `${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return jsonResponse({
        success: true,
        document: {
          name: file.name,
          type: file.type || "Document",
          size: file.size,
          storagePath,
        },
      });
    }

    const body = await request.json();
    const action = String(body.action || "");
    if (action !== "download" && action !== "view") {
      return jsonResponse({ error: "Invalid action." }, 400);
    }

    if (profile.role !== "dilg" && profile.role !== "barangay" && profile.role !== "citizen") {
      return jsonResponse(
        { error: "You do not have permission to access documents." },
        403,
      );
    }

    const storagePath = String(body.storagePath || "").trim();
    if (!storagePath) {
      return jsonResponse({ error: "Document path is missing." }, 400);
    }

    const isCitizenVerification = storagePath.includes("/citizens/");
    if (isCitizenVerification && profile.role === "dilg") {
      return jsonResponse({ error: "Citizen verification files are private." }, 403);
    }
    if (profile.role === "citizen") {
      const ownCitizenPath = `${profile.barangayId}/citizens/${profile.uid}/`;
      if (!isCitizenVerification || !storagePath.startsWith(ownCitizenPath)) {
        return jsonResponse({ error: "You can access only your own verification file." }, 403);
      }
    }

    // Barangay users may download only documents inside their own barangay.
    if (
      profile.role === "barangay" &&
      (!profile.barangayId || !storagePath.startsWith(`${profile.barangayId}/`))
    ) {
      return jsonResponse(
        { error: "You cannot download another barangay's document." },
        403,
      );
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 60, action === "download" ? { download: true } : undefined);

    if (error) throw error;

    return jsonResponse({ success: true, signedUrl: data.signedUrl });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: error instanceof Error
          ? error.message
          : "Document request failed.",
      },
      500,
    );
  }
});
