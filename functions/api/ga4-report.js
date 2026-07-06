import { fetchGa4Dashboard, loadGa4Credentials } from "../lib/ga4-report-core.js";

export async function onRequestGet(context) {
  const { ADMIN_PIN, GOOGLE_SERVICE_ACCOUNT_JSON } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");
  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }

  const creds = loadGa4Credentials({ GOOGLE_SERVICE_ACCOUNT_JSON });
  if (!creds) {
    return json(
      {
        error: "GOOGLE_SERVICE_ACCOUNT_JSON 未設定",
        hint: "Cloudflare Pages の Secrets に Indexing 用 SA JSON を追加",
      },
      500,
    );
  }

  const days = Number(url.searchParams.get("days") || 7);
  const country = url.searchParams.get("country") === "all" ? "all" : "Japan";

  try {
    const report = await fetchGa4Dashboard(creds, { days, country });
    return json(report);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
