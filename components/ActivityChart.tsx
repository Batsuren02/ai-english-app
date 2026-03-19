'use client'

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { date: string; count: number }[]
}

export default function ActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="url(#activityGrad)" strokeWidth={2} dot={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: 12 }}
          formatter={(v: number) => [v, 'Reviews']}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
