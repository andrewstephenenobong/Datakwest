import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "not_authenticated" }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "not_authenticated" }, 401);

  let body: { feature_snapshot_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body.feature_snapshot_id || typeof body.feature_snapshot_id !== "string") {
    return json({ error: "feature_snapshot_id_required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: contract, error: contractError } = await admin.rpc("get_shadow_model_contract", { p_model_key: "mastery_prediction" });
  if (contractError) return json({ error: "model_contract_unavailable" }, 503);
  if (!contract?.available || !contract?.model_id || !contract?.shadow_only) {
    return json({ available: false, reason: "no_validated_shadow_model" }, 202);
  }

  const { data: snapshot, error: snapshotError } = await admin
    .from("learner_feature_snapshots")
    .select("id, learner_id, skill_graph_version_id, feature_set_version, features, snapshot_at")
    .eq("id", body.feature_snapshot_id)
    .eq("learner_id", userData.user.id)
    .maybeSingle();
  if (snapshotError) return json({ error: "feature_snapshot_unavailable" }, 503);
  if (!snapshot) return json({ error: "feature_snapshot_not_found" }, 404);

  if (snapshot.feature_set_version !== contract.feature_set_version) {
    return json({ available: false, reason: "feature_set_version_mismatch", expected: contract.feature_set_version }, 409);
  }

  // The actual model artifact is intentionally not loaded from learner input or
  // client-controlled URLs. Until a validated artifact is registered and its
  // evaluation gate passes, this endpoint remains a safe, auditable no-op.
  return json({
    available: false,
    reason: "shadow_artifact_not_registered",
    model_id: contract.model_id,
    model_version: contract.model_version,
    learner_id: userData.user.id,
    feature_snapshot_id: snapshot.id,
    serving_mode: "shadow",
  }, 202);
});
