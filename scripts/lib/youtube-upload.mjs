/**
 * YouTube Data API v3 — 動画アップロード + コメント
 */
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { getAccessToken } from "./youtube-oauth.mjs";

const UPLOAD_INIT =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const COMMENTS_URL = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet";

/**
 * @param {string} filePath
 * @param {{
 *   title: string;
 *   description: string;
 *   tags?: string[];
 *   categoryId?: string;
 *   privacyStatus?: 'public'|'private'|'unlisted';
 * }} meta
 */
export async function uploadVideo(filePath, meta) {
  const accessToken = await getAccessToken();
  const size = statSync(filePath).size;
  const tags = (meta.tags ?? []).slice(0, 30).map((t) => String(t).slice(0, 30));

  const initRes = await fetch(UPLOAD_INIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify({
      snippet: {
        title: meta.title.slice(0, 100),
        description: meta.description.slice(0, 5000),
        tags,
        categoryId: meta.categoryId ?? "25",
        defaultLanguage: "ja",
      },
      status: {
        privacyStatus: meta.privacyStatus ?? "public",
        selfDeclaredMadeForKids: false,
      },
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`アップロード開始失敗 ${initRes.status}: ${err.slice(0, 300)}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("resumable upload URL が返りませんでした");

  const body = await readFile(filePath);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
    },
    body,
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`動画送信失敗 ${putRes.status}: ${err.slice(0, 300)}`);
  }

  const video = await putRes.json();
  const videoId = video.id;
  if (!videoId) throw new Error("videoId が取得できませんでした");

  return {
    videoId,
    url: `https://www.youtube.com/shorts/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
    raw: video,
  };
}

/**
 * @param {string} videoId
 * @param {string} text
 */
export async function postTopComment(videoId, text) {
  const accessToken = await getAccessToken();
  const res = await fetch(COMMENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: text.slice(0, 10_000),
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`コメント投稿失敗 ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json();
}
