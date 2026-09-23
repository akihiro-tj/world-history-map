import { serveFromBucket } from "./serve";

export interface Env {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
}

// 静的アセットに一致しないリクエストと、run_worker_first に指定したパスだけがここに来る
export default {
  async fetch(request, env): Promise<Response> {
    return serveFromBucket(request, env.ASSETS_BUCKET);
  },
} satisfies ExportedHandler<Env>;
