import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const BUCKET = "private-receipt-artifacts"
const MAX_BYTES = 10 * 1024 * 1024
const MIME_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"])
const ROLES = new Set(["original", "transfer"])
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function safeFilename(value: unknown) {
  return String(value ?? "").replace(/[^a-zA-Z0-9._-]/g, "-")
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const authHeader = request.headers.get("Authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return json({ error: "authentication_required" }, 401)

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  if (!secretKey || !supabaseUrl) return json({ error: "server_configuration_unavailable" }, 500)
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } })

  const user = await admin.auth.getUser(token)
  if (user.error || !user.data.user) return json({ error: "authentication_invalid" }, 401)
  const operator = await admin.from("companion_members")
    .select("user_id")
    .eq("user_id", user.data.user.id)
    .eq("person_key", "kavi")
    .eq("active", true)
    .maybeSingle()
  if (operator.error || !operator.data) return json({ error: "operator_not_authorized" }, 403)

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: "payload_invalid" }, 400)
  }
  const { receiptId, role, filename, mimeType, displayLabel, displayOrder, capturedAt, sha256, bytesBase64 } = payload ?? {}
  if (!/^[0-9a-f-]{36}$/i.test(receiptId ?? "") || !ROLES.has(role) || !MIME_TYPES.has(mimeType)) {
    return json({ error: "artifact_binding_invalid" }, 400)
  }
  if (!Number.isInteger(displayOrder) || displayOrder < 1 || !String(displayLabel ?? "").trim() || Number.isNaN(Date.parse(capturedAt))) {
    return json({ error: "artifact_metadata_invalid" }, 400)
  }
  const cleanFilename = safeFilename(filename)
  if (!cleanFilename || !/^[0-9a-f]{64}$/i.test(sha256 ?? "") || !String(bytesBase64 ?? "").length) {
    return json({ error: "artifact_payload_invalid" }, 400)
  }

  let bytes
  try {
    bytes = Uint8Array.from(atob(bytesBase64), value => value.charCodeAt(0))
  } catch {
    return json({ error: "artifact_encoding_invalid" }, 400)
  }
  if (!bytes.length || bytes.length > MAX_BYTES) return json({ error: "artifact_size_invalid" }, 400)
  const calculatedSha = hex(await crypto.subtle.digest("SHA-256", bytes))
  if (calculatedSha !== sha256.toLowerCase()) return json({ error: "artifact_checksum_invalid" }, 400)

  const receipt = await admin.from("wallet_receipts").select("id").eq("id", receiptId).maybeSingle()
  if (receipt.error || !receipt.data) return json({ error: "receipt_not_found" }, 404)
  const objectPath = `${receiptId}/${role}/${cleanFilename}`
  const existing = await admin.from("receipt_artifacts")
    .select("id,sha256,object_path")
    .eq("bucket_id", BUCKET)
    .eq("object_path", objectPath)
    .maybeSingle()
  if (existing.error) return json({ error: "manifest_read_failed" }, 500)
  if (existing.data) {
    if (existing.data.sha256 !== calculatedSha) return json({ error: "artifact_conflict" }, 409)
    return json({ status: "already_applied", artifactId: existing.data.id, objectPath })
  }

  const upload = await admin.storage.from(BUCKET).upload(objectPath, bytes, { contentType: mimeType, upsert: false })
  if (upload.error) return json({ error: "artifact_upload_failed" }, 500)
  const inserted = await admin.from("receipt_artifacts").insert({
    receipt_id: receiptId,
    artifact_role: role,
    bucket_id: BUCKET,
    object_path: objectPath,
    mime_type: mimeType,
    byte_size: bytes.byteLength,
    sha256: calculatedSha,
    display_label: String(displayLabel).trim(),
    display_order: displayOrder,
    captured_at: capturedAt,
  }).select("id,sha256,object_path").single()
  if (inserted.error) {
    await admin.storage.from(BUCKET).remove([objectPath])
    return json({ error: "manifest_insert_failed" }, 500)
  }

  const readback = await admin.storage.from(BUCKET).download(objectPath)
  if (readback.error) return json({ error: "artifact_readback_failed" }, 500)
  const storedSha = hex(await crypto.subtle.digest("SHA-256", await readback.data.arrayBuffer()))
  if (storedSha !== calculatedSha || inserted.data.sha256 !== calculatedSha) {
    return json({ error: "artifact_readback_mismatch" }, 500)
  }
  return json({ status: "applied", artifactId: inserted.data.id, objectPath, byteSize: bytes.byteLength })
})
