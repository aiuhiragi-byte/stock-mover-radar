import { useMemo } from 'react'
import type { ResultEntry, ResultMap } from '../lib/types'
import { SURGE_THRESHOLD_PERCENT } from '../lib/constants'
import { formatTime } from '../lib/format'
import { MoverTable } from './MoverTable'

interface Props {
  results: ResultMap
  segmentFilter: { large: boolean; mid: boolean }
  onSegmentFilterChange: (filter: { large: boolean; mid: boolean }) => void
  showAll: boolean
  onShowAllChange: (value: boolean) => void
  universeSize: number
}

export function MoversBoard({
  results,
  segmentFilter,
  onSegmentFilterChange,
  showAll,
  onShowAllChange,
  universeSize,
}: Props) {
  const { surge, plunge, others, fetchedCount, lastUpdated } = useMemo(() => {
    const visible = Object.values(results).filter((e) => segmentFilter[e.segment])
    const surgeList: ResultEntry[] = []
    const plungeList: ResultEntry[] = []
    const otherList: ResultEntry[] = []
    let fetched = 0
    let last: number | null = null

    for (const e of visible) {
      if (e.updatedAt !== null) {
        fetched += 1
        if (last === null || e.updatedAt > last) last = e.updatedAt
      }
      if (e.percentChange === null) continue
      if (e.percentChange >= SURGE_THRESHOLD_PERCENT) surgeList.push(e)
      else if (e.percentChange <= -SURGE_THRESHOLD_PERCENT) plungeList.push(e)
      else otherList.push(e)
    }

    surgeList.sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0))
    plungeList.sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0))
    otherList.sort((a, b) => Math.abs(b.percentChange ?? 0) - Math.abs(a.percentChange ?? 0))

    return { surge: surgeList, plunge: plungeList, others: otherList, fetchedCount: fetched, lastUpdated: last }
  }, [results, segmentFilter])

  return (
    <>
      <section className="panel">
        <div className="panel-body summary-row">
          <div className="summary-stat">
            <span className="summary-value">
              {fetchedCount} / {universeSize}
            </span>
            <span className="summary-label">取得済み銘柄</span>
          </div>
          <div className="summary-stat">
            <span className="summary-value up">{surge.length}</span>
            <span className="summary-label">急騰（+{SURGE_THRESHOLD_PERCENT}%以上）</span>
          </div>
          <div className="summary-stat">
            <span className="summary-value down">{plunge.length}</span>
            <span className="summary-label">急落（-{SURGE_THRESHOLD_PERCENT}%以下）</span>
          </div>
          <div className="summary-stat">
            <span className="summary-value">{formatTime(lastUpdated)}</span>
            <span className="summary-label">最終更新</span>
          </div>
        </div>
        <div className="panel-body filter-row">
          <label>
            <input
              type="checkbox"
              checked={segmentFilter.large}
              onChange={(e) => onSegmentFilterChange({ ...segmentFilter, large: e.target.checked })}
            />
            大型株
          </label>
          <label>
            <input
              type="checkbox"
              checked={segmentFilter.mid}
              onChange={(e) => onSegmentFilterChange({ ...segmentFilter, mid: e.target.checked })}
            />
            中型株
          </label>
          <label>
            <input type="checkbox" checked={showAll} onChange={(e) => onShowAllChange(e.target.checked)} />
            しきい値未満も含めて全件表示
          </label>
        </div>
      </section>

      <MoverTable title="急騰" entries={surge} emptyMessage="現在、急騰している銘柄はありません。" />
      <MoverTable title="急落" entries={plunge} emptyMessage="現在、急落している銘柄はありません。" />
      {showAll && (
        <MoverTable title="その他（しきい値未満）" entries={others} emptyMessage="データがありません。" />
      )}
    </>
  )
}
