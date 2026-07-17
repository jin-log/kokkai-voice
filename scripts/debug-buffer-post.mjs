import {
  loadBufferApiKeyAsync,
  bufferGraphql,
} from "../src/lib/buffer-api.mjs";

const id = process.argv[2] || "6a58aada40e87b1aec46eea7";
const apiKey = await loadBufferApiKeyAsync();
const data = await bufferGraphql(
  apiKey,
  `query GetPost($id: PostId!) {
    post(input: { id: $id }) {
      ... on Post {
        id
        text
        status
        sentAt
        assets { id mimeType }
      }
    }
  }`,
  { id },
);
console.log(JSON.stringify(data, null, 2));
