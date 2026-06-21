import type { ResultEntry } from '../lib/types'
import { formatPercent, formatPrice, formatSignedNumber, formatTime, formatVolume } from '../lib/format'

interface Props {
  title: string
  entries: ResultEntry[]
  emptyMessage: string
}

const SEGMENT_LABEL: Record<ResultEntry['segment'], string> = {
  large: '大型',
  mid: '中型',
}

export function MoverTable({ title, entries, emptyMessage }: Props) {
  return (
    <section className="panel">
      <h2 className="mover-title">
        {title} <span className="mover-count">{entries.length}件</span>
      </h2>
      {entries.length === 0 ? (
        <p className="hint">{emptyMessage}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>コード</th>
                <th>銘柄名</th>
                <th>区分</th>
                <th className="num">現在値</th>
                <th className="num">前日比</th>
                <th className="num">前日比%</th>
                <th className="num">出来高</th>
                <th>更新時刻</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const dir = e.percentChange === null ? '' : e.percentChange > 0 ? 'up' : e.percentChange < 0 ? 'down' : ''
                return (
                  <tr key={e.code} className={dir}>
                    <td>{e.code}</td>
                    <td className="name-cell">{e.name}</td>
                    <td>
                      <span className={`badge badge-${e.segment}`}>{SEGMENT_LABEL[e.segment]}</span>
                    </td>
                    <td className="num">{formatPrice(e.price)}</td>
                    <td className={`num ${dir}`}>{formatSignedNumber(e.change)}</td>
                    <td className={`num ${dir}`}>{formatPercent(e.percentChange)}</td>
                    <td className="num">{formatVolume(e.volume)}</td>
                    <td>{formatTime(e.updatedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
