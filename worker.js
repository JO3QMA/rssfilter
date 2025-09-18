// Cloudflare Workers用のエントリーポイント
import wasmModule from './main.wasm';

let wasmInstance = null;

// WASMモジュールを初期化
async function initWasm() {
  if (!wasmInstance) {
    const go = new Go();
    wasmInstance = await WebAssembly.instantiate(wasmModule, go.importObject);
    go.run(wasmInstance.instance);
  }
  return wasmInstance;
}

// メインのリクエストハンドラー
export default {
  async fetch(request, env, ctx) {
    try {
      // WASMモジュールを初期化
      await initWasm();
      
      // リクエストURLを取得
      const url = request.url;
      
      // GoのhandleRequest関数を呼び出し
      const result = handleRequest({ url });
      
      // レスポンスを作成
      return new Response(result.body, {
        status: result.status,
        headers: result.headers
      });
      
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
