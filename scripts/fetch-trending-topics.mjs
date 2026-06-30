#!/usr/bin/env node
/**
 * 政治・関心ワードを収集 → data/trending-topics.json
 *
 *   npm run trends:fetch
 */
import { fetchTrendingTopics, saveTrendingTopics } from "../src/lib/trending-topics.mjs";

const data = await fetchTrendingTopics({
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

await saveTrendingTopics(data);

console.log(`トレンドカード: ${data.trendCards.length} 件`);
console.log(`政治系: ${data.political.length} 件`);
console.log(`急上昇: ${data.rising.length} 件`);
console.log(`常連候補: ${data.evergreen.length} 件`);
console.log(`保存: data/trending-topics.json`);
