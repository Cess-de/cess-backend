// supabase/functions/_shared/email.ts

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend send failed:", res.status, errText);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Mail send failed:", e);
    return false;
  }
}
