/**
 * 試験用: Buffer 経由で画像付き X 投稿
 *
 *   node scripts/post-x-with-image.mjs --slug kojin-joho-kaisei --image-url https://seiji1192.site/assets/og/kojin-joho-kaisei.png
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle } from "../src/lib/articles.mjs";
import { formatXMainPost } from "../src/lib/promo-generate.mjs";
import {
  loadBufferApiKeyAsync,
  loadBufferChannelId,
  resolveTwitterChannel,
  createXPost,
} from "../src/lib/buffer-api.mjs";
import { recordBufferPost, refreshBufferStatus } from "../src/lib/buffer-status.mjs";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug");
const imageUrl = arg("--image-url");
const dryRun = args.includes("--dry-run");

if (!slug || !imageUrl) {
  console.error(
    "Usage: node scripts/post-x-with-image.mjs --slug <slug> --image-url <https://...>",
  );
  process.exit(1);
}

const article = await loadArticle(slug);
const text = `[サムネ試験]\n${formatXMainPost(article)}`;

console.log("--- text ---");
console.log(text);
console.log("--- image ---");
console.log(imageUrl);

if (dryRun) process.exit(0);

const apiKey = await loadBufferApiKeyAsync();
if (!apiKey) {
  console.error("BUFFER_API_KEY 未設定");
  process.exit(1);
}

const check = await refreshBufferStatus();
if (!check.ok) {
  console.error(`NG Buffer — ${check.message}`);
  process.exit(1);
}

const channelId = loadBufferChannelId() || check.channelId;
const resolved = await resolveTwitterChannel(apiKey, channelId);
if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const post = await createXPost(apiKey, {
  channelId: resolved.channel.id,
  text,
  imageUrls: [imageUrl],
});

await recordBufferPost({
  slug: `${slug}:thumb-trial`,
  ok: true,
  postId: post.id,
});
console.log(`OK Buffer post ${post.id}`);
console.log(`https://buffer.com`);
