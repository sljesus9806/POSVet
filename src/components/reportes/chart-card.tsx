"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--info)",
  "#9333ea",
  "#0891b2",
  "#dc2626",
];

function fmtNumber(n: number, currency = false): string {
  if (currency) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("es-MX").format(n);
}

type Datum = Record<string, string | number>;

export type ChartProps = {
  data: Datum[];
  xKey: string;
  yKeys: Array<{ key: string; label: string; color?: string }>;
  type: "bar" | "line";
  currency?: boolean;
  height?: number;
};

export type DonutProps = {
  data: Array<{ label: string; valor: number }>;
  currency?: boolean;
  height?: number;
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "8px 10px",
  fontSize: "0.75rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function BarOrLineChart({
  data,
  xKey,
  yKeys,
  type,
  currency,
  height = 240,
}: ChartProps) {
  const Component = type === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Component data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          tickFormatter={(v: number) =>
            currency ? fmtNumber(v, true) : fmtNumber(v)
          }
          width={currency ? 72 : 48}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={((v: unknown) =>
            currency
              ? fmtNumber(Number(v), true)
              : fmtNumber(Number(v))) as never}
        />
        {type === "line"
          ? yKeys.map((y, i) => (
              <Line
                key={y.key}
                type="monotone"
                dataKey={y.key}
                name={y.label}
                stroke={y.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))
          : yKeys.map((y, i) => (
              <Bar
                key={y.key}
                dataKey={y.key}
                name={y.label}
                fill={y.color ?? PALETTE[i % PALETTE.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
      </Component>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, currency, height = 240 }: DonutProps) {
  const total = data.reduce((acc, d) => acc + d.valor, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={((v: unknown, name: unknown) => {
            const val = Number(v);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
            return [
              `${currency ? fmtNumber(val, true) : fmtNumber(val)} (${pct}%)`,
              String(name),
            ];
          }) as never}
        />
        <Pie
          data={data}
          dataKey="valor"
          nameKey="label"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
