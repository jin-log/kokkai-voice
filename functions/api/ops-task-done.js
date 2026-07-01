const REPO = "jin-log/kokkai-voice";
const QUEUE_PATH = "data/ops-queue.json";
const LOG_PATH = "data/ops-task-log.jsonl";

function applyTaskComplete(queue, taskId) {
  const task = queue.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`タスクが見つかりません: ${taskId}`);
  const completedAt = new Date().toISOString();
  if (!task.done) {
    task.done = true;
    task.doneAt = completedAt;
    queue.generatedAt = completedAt;
  }
  return {
    queue,
    logLine: JSON.stringify({
      taskId,
      title: task.title ?? "",
      completedAt: task.doneAt ?? completedAt,
      by: "owner",
    }),
  };
}

export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { pin, taskId } = body;
  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!GH_TOKEN) {
    return json({ error: "GH_TOKEN 未設定" }, 500);
  }
  if (!taskId?.trim()) {
    return json({ error: "taskId は必須です" }, 400);
  }

  try {
    const queueMeta = await ghGetFile(GH_TOKEN, QUEUE_PATH);
    const queue = JSON.parse(atob(queueMeta.content.replace(/\n/g, "")));
    const { queue: updated, logLine } = applyTaskComplete(queue, taskId.trim());

    let logContent = `${logLine}\n`;
    let logSha = null;
    try {
      const logMeta = await ghGetFile(GH_TOKEN, LOG_PATH);
      logSha = logMeta.sha;
      logContent = `${atob(logMeta.content.replace(/\n/g, ""))}${logLine}\n`;
    } catch {
      /* new log file */
    }

    await ghPutFile(GH_TOKEN, QUEUE_PATH, queueMeta.sha, JSON.stringify(updated, null, 2) + "\n", "ops: complete task");
    await ghPutFile(GH_TOKEN, LOG_PATH, logSha, logContent, `ops: log complete ${taskId.trim()}`);

    const task = updated.tasks.find((t) => t.id === taskId.trim());
    return json({
      ok: true,
      message: `完了: ${task?.title ?? taskId}`,
      taskId: taskId.trim(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
}

async function ghGetFile(token, filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=main`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) throw new Error(`GitHub read ${filePath}: ${res.status}`);
  return res.json();
}

async function ghPutFile(token, filePath, sha, content, message) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: "main",
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub write ${filePath}: ${res.status} ${detail}`);
  }
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kokkai-voice-pages/1.0",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
