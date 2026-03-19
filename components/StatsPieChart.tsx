'use client'

import { PieChart, Pie, Cell, Tooltip } from 'recharts'

const COLORS = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

interface Props {
  data: { level: string; count: number }[]
}

export default function StatsPieChart({ data }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      <PieChart width={150} height={150}>
        <Pie data={data} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
      </PieChart>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((item, i) => (
          <div key={item.level} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-sm text-[var(--text)]">{item.level}: {item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
