'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { TooltipProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

interface BarConfig {
  dataKey: string
  fill: string
  name: string
  radius?: [number, number, number, number]
}

interface Props {
  data: Record<string, unknown>[]
  height: number
  bars: BarConfig[]
  xDataKey: string
  yAxisProps?: { allowDecimals?: boolean }
  tooltipFormatter?: TooltipProps<ValueType, NameType>['formatter']
}

export default function StatsBarChart({ data, height, bars, xDataKey, yAxisProps, tooltipFormatter }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey={xDataKey} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} {...(yAxisProps ?? {})} />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
          formatter={tooltipFormatter}
        />
        {bars.map((b) => (
          <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.fill} radius={b.radius ?? [6, 6, 0, 0]} name={b.name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
