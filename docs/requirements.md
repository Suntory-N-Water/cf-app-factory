## やりたいこと

自然言語でプロンプトを投げると、バックエンド付きのミニアプリが即座に生えてくる仕組みを、Cloudflare の新機能を使って個人で検証してみたい。

- **日曜大工レベル**：初回のみローカルで実装・デプロイ（`bunx wrangler deploy`）。以降の運用（アプリ生成・一覧・停止・削除）はブラウザの管理ダッシュボードからすべて完結する。
- **自分だけ使える**：他人が使うとコストがかさむので自分専用にする
- **コード詳細は後回し**：まず動くものを見てみたい段階

---

## Gemini Canvas との違い（なぜ面白いか）

ChatGPT / Gemini / Claude の Canvas 機能でもプロンプトからアプリを生成できるが、本質的に違う点がある。

```
Gemini Canvas
  プロンプト → コード生成 → ブラウザのiframe（サンドボックス） → 閉じたら消える
                                ↑
                         バックエンドなし・URLなし・状態消える

Cloudflare Dynamic Workers
  プロンプト → コード生成 → Cloudflare エッジにデプロイ → URLが残る → DBも残る
                                ↑
                       本物のバックエンド・本物のURL・状態が永続する
```

「電卓アプリ作って」と頼んだとき：
- Gemini Canvas → ブラウザだけで動くUIが出る
- Dynamic Workers → 計算履歴をDBに保存し続ける電卓が URL として生えてきて次の日も使える

---

## 仕組みの全体像

Agents が「脳」、Dynamic Workers が「実行エンジン」という役割分担。

```
[ブラウザ] プロンプト入力
     |
     v
[親元 Worker（自分が書くコード）]
     |─── Workers AI（コード生成）
     |─── Supervisor Durable Object（メタ情報管理・コード保存）
     |
     v
[Dynamic Workers]  ← 生成コードが V8 isolate で実行（コンテナより100倍速い）
     |
     v
[Durable Object Facets]  ← アプリ専用の SQLite が自動で付く・状態が永続する
```

---

## 調査済み：未確認だった4点の答え

### 1. 生成アプリの外部URLはどうなるか

**Dynamic Workers 自体には独立した URL はない。** 親 Worker がパスで振り分ける。

```
https://my-worker.workers.dev/app/app-id-123/
                              ↑
              親Workerがここを受け取り、対応するDynamic Workerに転送
```

アプリIDをパスに含めることで「アプリごとの URL」を実現する。

### 2. Cloudflare Access は workers.dev に使えるか

**使える。カスタムドメイン不要。**

ダッシュボード上で完結する。
> Workers & Pages → 対象Worker → Settings → Domains & Routes → workers.dev → **Enable Cloudflare Access**

これで自分のメールアドレスだけを許可するポリシーを設定できる。

### 3. アプリのメタ情報（一覧・停止・削除）をどこに保存するか

**Supervisor Durable Object の SQLite に保存する。** 公式ドキュメントにも明記されている。

> In production, you would typically store the dynamic code itself in the supervisor's database and load it in the `#loadDynamicWorker()` method.

Supervisor の SQLite に以下を保存する：
- アプリID
- アプリ名（プロンプトから生成）
- 生成されたコード
- 作成日時
- 状態（running / stopped / deleted）

### 4. Workers AI が Durable Object の API を知らない問題

**システムプロンプトに TypeScript 型定義を渡すことで解決できる。** 公式 Bindings ドキュメントに記載あり。

> For an AI agent to write code against your bindings, it needs to know the interface. Give your agent TypeScript type declarations with doc comments describing each method. Modern LLMs understand TypeScript well, making it the most concise way to describe a JavaScript API.

コード生成に適したモデルとして Workers AI のモデル一覧ページに `Qwen2.5-Coder-32b-instruct` が掲載されていた。正確なモデルID文字列は実装前に公式ドキュメントで確認すること。

---

## 実装計画

### 使用するテンプレリポジトリ

技術スタックと規約：

| 項目 | 内容 |
|---|---|
| ルーティング | Hono |
| バリデーション | Valibot |
| Linter / Formatter | Biome |
| ランタイム / パッケージマネージャ | Bun |
| wrangler 実行 | `bunx wrangler`（`wrangler` 単体では使わない） |
| 静的解析 | `bun run ai-check` |
| コメント・ログ・コミットメッセージ | 日本語 |
| UI | Hono/jsx（React 不使用）|

**UI 方針：** 管理ダッシュボードは `@cloudflare/kumo`（React 必須）を使わず、Hono/jsx で HTML を直接返す。`GET /` でプロンプト入力フォーム・アプリ一覧・停止/削除ボタンを含む管理画面を SSR する。React・ビルドパイプライン不要。

**ブラウザ操作の仕組み：** `GET /` が返す HTML に vanilla JS の `<script>` を埋め込む。ボタン操作は `fetch()` で各 API エンドポイントを呼び出し、結果を DOM に反映する。サーバーサイドのページ遷移なし。

**`GET /app/:id/*` の仕組み：** `env.LOADER.get(id, callback)` で対応する Dynamic Worker を取得し、`.fetch(request)` でリクエストをそのまま転送してレスポンスを返す。

### リポジトリ名

`cf-app-factory`

### 自分が書くコードの範囲

このリポジトリ（`cf-app-factory`）の `src/index.ts` に実装し、`bunx wrangler deploy` でデプロイする。エンドポイントは6本。

```
GET  /                    管理ダッシュボード（プロンプト入力フォーム・アプリ一覧・停止/削除ボタン）
POST /api/generate        プロンプト → Workers AI → コード生成 → Dynamic Workers 登録
GET  /api/apps            アプリ一覧を返す（Supervisor SQLite から読む）
POST /api/apps/:id/stop   アプリを停止（facets.abort）← ストレージは保持・再起動可能
DELETE /api/apps/:id      アプリを削除（facets.delete）← ストレージも完全削除・復元不可
GET  /app/:id/*           親 Worker がパスを受け取り、対応する Dynamic Worker に転送する
```

### wrangler.jsonc に必要なバインディング

```jsonc
{
  "worker_loaders": [{ "binding": "LOADER" }],
  "ai": { "binding": "AI" },
  "durable_objects": {
    "bindings": [{ "name": "SUPERVISOR", "class_name": "AppSupervisor" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["AppSupervisor"] }]
}
```

### Workers AI へのシステムプロンプト設計

LLM に Durable Object の API を使わせるには、型定義をシステムプロンプトに含める方針が公式ドキュメントで推奨されている。具体的な型定義は `bun run cf-typegen` で生成した `worker-configuration.d.ts` を参照して正確なものを使うこと。

### デプロイ手順

```
Step 1: cf-app-factory リポジトリで実装し、bunx wrangler deploy でデプロイする

Step 2: workers.dev に Cloudflare Access をかける
  Settings → Domains & Routes → workers.dev → Enable Cloudflare Access
  → 自分のメールアドレスのみ許可

Step 3: 動作確認
  → ブラウザで https://cf-app-factory.workers.dev/ を開き管理ダッシュボードが表示されるか
  → プロンプトを入力して送信し、アプリの URL が一覧に表示されるか
  → /app/:id/ で生成されたアプリにアクセスできるか
  → 別ブラウザでアクセスして弾かれるか
```

---

## 料金

| 項目 | 無料枠 |
|------|--------|
| ユニーク Dynamic Workers | 月 1,000 まで |
| リクエスト | 月 1,000 万まで |
| Workers Paid plan | 月 $5（必須） |

自分1人で使う分には無料枠内に収まる。

---

## 引用・参照

### Cloudflare 公式ドキュメント

- [Dynamic Workers 概要](https://developers.cloudflare.com/dynamic-workers/)
- [Dynamic Workers Getting Started](https://developers.cloudflare.com/dynamic-workers/getting-started/)
- [Durable Object Facets](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/)
- [Dynamic Workers Bindings](https://developers.cloudflare.com/dynamic-workers/usage/bindings/)
- [workers.dev の Access 設定](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Workers AI モデル一覧](https://developers.cloudflare.com/workers-ai/models/)
- [Dynamic Workers Playground（GitHub）](https://github.com/cloudflare/agents/tree/main/examples/dynamic-workers-playground)

### 関連する自分のノート・記事

- あいまいな記憶を手がかりに過去のメモを引き出すセマンティック検索を Cloudflare Vectorize で作った(https://suntory-n-water.com/blog/obsidian-semantic-search-cloudflare-vectorize.md)
  - Cloudflare Workers + APIキー認証の実装パターンは流用できる

---

## 残っている懸念・未確認事項

- オープンベータ（2026年3月〜）なので仕様変更リスクあり
- `@cf/qwen/qwen2.5-coder-32b-instruct` が Facets の型定義を渡した上でどこまで正確なコードを生成できるかは未検証
- Supervisor の SQLite への読み書き実装の詳細（Workers のストレージ API の具体的な呼び方）

---

## 次のアクション候補

- [ ] cf-app-factory リポジトリに6本のエンドポイントを実装する（別AIに依頼）
- [ ] bunx wrangler deploy でデプロイする
- [ ] Cloudflare Access を workers.dev にかけて自分専用化する
