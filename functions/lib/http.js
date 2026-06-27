/** @param {unknown} data @param {number} [status] */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** @param {string} message @param {number} [status] */
export function jsonError(message, status = 400) {
  return json({ error: message }, status);
}
