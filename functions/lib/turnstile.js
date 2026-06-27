/**
 * @param {{ secret?: string, token?: string, ip?: string|null }} opts
 * @returns {Promise<boolean>}
 */
export async function verifyTurnstile({ secret, token, ip }) {
  if (!secret) return true;
  if (!token) return false;

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.success);
}
