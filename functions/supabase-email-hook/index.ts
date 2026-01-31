// supabase/functions/supabase-email-hook/index.ts
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const DEFAULT_FROM = Deno.env.get("DEFAULT_FROM"); // 例: "Biblio Radar <noreply@yourdomain.com>"

    if (!RESEND_API_KEY) {
      return json(500, { error: "Missing env: RESEND_API_KEY" });
    }

    const payload = await req.json();

    /**
     * Supabase Auth Hookのpayloadは将来変わる可能性があるので
     * ここでは「to/subject/html が取れたら送る」という最小実装にしてる
     */
    const to = payload?.to;
    const subject = payload?.subject;
    const html = payload?.html;
    const from = payload?.from || DEFAULT_FROM;

    if (!to || !subject || !html) {
      return json(400, {
        error: "Missing fields. Required: to, subject, html",
        received: { to, subject, hasHtml: !!html },
      });
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const resendData = await resendResp.json().catch(() => ({}));

    if (!resendResp.ok) {
      return json(502, {
        error: "Resend API error",
        status: resendResp.status,
        details: resendData,
      });
    }

    return json(200, { ok: true, resend: resendData });
  } catch (e) {
    console.error("supabase-email-hook error:", e);
    return json(500, { error: "Internal Server Error" });
  }
});