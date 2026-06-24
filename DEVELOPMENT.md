# Stock Mover Radar — 開発記録

## 概要

東証（JPX）の大型・中型株を対象に、前日比 ±5% の「急騰・急落」を一覧表示するモニタリング用 SPA。
バックエンドサーバーは持たず、GitHub Actions が定期的に価格を取得して静的 JSON を生成し、
フロントエンドはその JSON を読み込んで表示するだけの構成（サーバーレス・静的配信）。

## デプロイ先

- 本番URL: https://stock-mover-radar.vercel.app
- ホスティング: Vercel（`vercel deploy --prod`）

## 技術スタック

- フロントエンド: React 18 + TypeScript + Vite 6
- データ取得スクリプト: `tsx`（Node.js で TypeScript を直接実行）
- Lint: ESLint 9 + typescript-eslint
- パッケージ管理: npm

## 使用API

- **Yahoo Finance 非公式チャートAPI**
  - エンドポイント: `https://query1.finance.yahoo.com/v8/finance/chart/{コード}.T`
  - 実装: `src/lib/yahoo.ts`
  - 認証不要・APIキー不要
  - 銘柄コードに `.T`（東証）を付与して東証ティッカーとして問い合わせる
  - レスポンスの `regularMarketPrice`（現在値）、`chartPreviousClose`（前日終値）、
    `regularMarketVolume`（出来高）、`currentTradingPeriod`（取引時間→市場が開いているか）を利用
  - 非公式APIのため明示的なレート制限は無いが、`DEFAULT_CONCURRENCY = 5` 件ずつ
    バッチ処理し、バッチ間に `DEFAULT_BATCH_INTERVAL_MS = 300ms` の間隔を空けて負荷を抑制
  - 取得失敗時は前回成功分の値をフォールバックとして保持し、`error` フィールドにエラー内容を記録

> 補足: 当初は Twelve Data API（APIキー必須）を使用していたが、リクエスト制限の問題により
> Yahoo Finance の非公式APIに切り替え済み（コミット `892c572`）。現在のUIにはAPIキー入力欄は無い。

## データフロー

1. `scripts/scan.ts` が `src/data/stocks.ts` の銘柄リスト（104件: 大型66 / 中型38）を
   バッチ処理で Yahoo Finance に問い合わせる
2. 取得結果を `public/scan-results.json` に書き出す（`generatedAt` タイムスタンプ付き）
3. GitHub Actions（`scan.yml`）がこのファイルを `github-actions[bot]` としてリポジトリにコミット・push
4. push をトリガーに別ワークフロー（`deploy.yml`）が Vercel への再デプロイを実行
5. フロントエンド（`src/App.tsx`）は起動時に `/scan-results.json` を `fetch`（`cache: 'no-store'`）し、
   急騰（+5%以上）・急落（-5%以下）・その他に分類して表示

## 銘柄リスト

- `src/data/stocks.ts` に固定リストとしてハードコード（104銘柄）
- 大型株 / 中型株の区分はおおよその市場規模・知名度による簡易分類で、
  TOPIX等の公式インデックス区分とは一致しない
- 必要に応じて手動でリストを編集して調整する想定

## UI仕様

- ヘッダー: 最終取得時刻（`generatedAt`）と「6時間ごとに自動更新」の案内文を表示
- フィルター: 大型株 / 中型株 の表示切り替えチェックボックス、しきい値未満も含めて全件表示するチェックボックス
- サマリー: 取得済み銘柄数、急騰件数、急落件数、最終更新時刻
- 急騰テーブル / 急落テーブル: コード・銘柄名・区分・現在値・前日比・前日比%・出来高・更新時刻
- 表示設定（区分フィルター・全件表示フラグ）は `localStorage` に保存し次回起動時も保持
- データ取得に失敗した場合はエラーバナーを表示

## 定期実行（GitHub Actions）

### `scan.yml`（データ取得）
- トリガー: `schedule` で `cron: '0 */6 * * *'`（6時間ごと、UTC基準）+ `workflow_dispatch`（手動実行）
- 処理: `npm ci` → `npm run scan`（`scripts/scan.ts` 実行）→ `public/scan-results.json` を
  `github-actions[bot]` としてコミット・push（push 失敗時は `pull --rebase` してリトライ）
- 権限: `contents: write`

### `deploy.yml`（Vercelデプロイ）
- トリガー:
  - `push`（`main` ブランチ）
  - `workflow_dispatch`（手動実行）
  - `workflow_run`（`scan.yml` の完了をトレリガーに自動連携。`scan.yml` のコミットは
    デフォルトの `GITHUB_TOKEN` で行われるため `push` イベント単体では発火せず、
    この `workflow_run` 連携が無いとスキャン結果が自動で本番反映されない）
- ガード: `workflow_run` イベントの場合は `conclusion == 'success'` のときのみ実行
- チェックアウト先: `workflow_run` 時は `github.event.workflow_run.head_sha`（スキャン結果コミット）を明示指定
- デプロイ手順: `npx vercel deploy --token=$VERCEL_TOKEN --prod --yes`
- タイムアウト: ジョブ全体に `timeout-minutes: 10`
  （Vercel のビルドが稀に長時間ハングする事象への対策。ハングした場合はタイムアウトでキャンセルされ、
   次回のスキャンサイクルで再度デプロイが試行される自己修復構成）

## 既知の課題 / 留意点

- Vercel側のビルドが時々「Building…」のまま固まる現象が再発しており、根本原因は未特定
  （Vercelダッシュボードのビルドログを要確認。トリガー連携自体は正常に動作している）
- 銘柄の大型/中型区分は簡易分類であり、正式な指数区分ではない
- Yahoo Finance の非公式APIに依存しているため、仕様変更等で取得不能になるリスクがある
