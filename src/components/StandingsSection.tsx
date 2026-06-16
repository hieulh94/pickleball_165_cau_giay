import type { Participant, Pair } from '../types'
import { getPairLabel } from '../lib/pairing'
import type { GroupStandings, PairStanding } from '../lib/standings'

interface StandingsTableProps {
  groups: GroupStandings[]
  pairs: Pair[]
  participants: Participant[]
  splitGroups: boolean
}

function StandingsTable({
  standings,
  pairs,
  participants,
}: {
  standings: PairStanding[]
  pairs: Pair[]
  participants: Participant[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3 font-semibold">Hạng</th>
            <th className="px-4 py-3 font-semibold">Cặp đôi</th>
            <th className="px-4 py-3 text-center font-semibold">Trận</th>
            <th className="px-4 py-3 text-center font-semibold">Thắng</th>
            <th className="px-4 py-3 text-center font-semibold">Thua</th>
            <th className="px-4 py-3 text-center font-semibold">HS</th>
            <th className="px-4 py-3 text-center font-semibold">Điểm</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {standings.map((row) => {
            const pair = pairs.find((p) => p.id === row.pairId)
            const isTop = row.rank === 1 && row.played > 0

            return (
              <tr
                key={row.pairId}
                className={isTop ? 'bg-primary-50/80' : 'bg-white'}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isTop
                        ? 'bg-primary-600 text-white'
                        : row.rank <= 3 && row.played > 0
                          ? 'bg-neutral-200 text-neutral-700'
                          : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {pair ? getPairLabel(pair, participants) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-neutral-600">{row.played}</td>
                <td className="px-4 py-3 text-center font-medium text-primary-600">{row.wins}</td>
                <td className="px-4 py-3 text-center font-medium text-red-500">{row.losses}</td>
                <td className="px-4 py-3 text-center font-medium text-neutral-700">
                  {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                </td>
                <td className="px-4 py-3 text-center text-neutral-600">
                  {row.pointsFor}:{row.pointsAgainst}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function StandingsContent({
  groups,
  pairs,
  participants,
  splitGroups,
}: StandingsTableProps) {
  if (groups.length === 0) return null

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.group ?? 'all'}>
          {splitGroups && g.group && (
            <h4 className="mb-3 text-sm font-semibold text-secondary-700">{g.group}</h4>
          )}
          {!splitGroups && (
            <h4 className="mb-3 text-sm font-semibold text-neutral-700">Tổng bảng</h4>
          )}
          <StandingsTable
            standings={g.standings}
            pairs={pairs}
            participants={participants}
          />
        </div>
      ))}
    </div>
  )
}

export function StandingsSection(props: StandingsTableProps) {
  if (props.groups.length === 0) return null

  return (
    <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900">Bảng xếp hạng</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Xếp hạng theo số trận thắng, hiệu số điểm và tổng điểm ghi được
      </p>
      <div className="mt-6">
        <StandingsContent {...props} />
      </div>
    </section>
  )
}
