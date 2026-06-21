import { useState } from 'react'

interface Props {
  apiKey: string
  onChange: (key: string) => void
}

export function ApiKeySettings({ apiKey, onChange }: Props) {
  const [draft, setDraft] = useState(apiKey)
  const [reveal, setReveal] = useState(false)
  const [open, setOpen] = useState(apiKey === '')

  const dirty = draft !== apiKey

  return (
    <section className="panel">
      <button type="button" className="panel-header" onClick={() => setOpen((o) => !o)}>
        <span>APIキー設定</span>
        <span className="panel-status">{apiKey ? '設定済み' : '未設定'}</span>
      </button>
      {open && (
        <div className="panel-body">
          <p className="hint">
            <a href="https://twelvedata.com/" target="_blank" rel="noreferrer">
              Twelve Data
            </a>
            の無料アカウントで取得したAPIキーを入力してください。キーはこの端末のブラウザ内（localStorage）にのみ保存され、
            Twelve Data への直接リクエスト以外には送信されません。
          </p>
          <div className="apikey-row">
            <input
              type={reveal ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Twelve Data API key"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={() => setReveal((r) => !r)}>
              {reveal ? '隠す' : '表示'}
            </button>
          </div>
          <div className="apikey-actions">
            <button type="button" disabled={!dirty} onClick={() => onChange(draft.trim())}>
              保存
            </button>
            <button
              type="button"
              className="secondary"
              disabled={draft === ''}
              onClick={() => {
                setDraft('')
                onChange('')
              }}
            >
              削除
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
