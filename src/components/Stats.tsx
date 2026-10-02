import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateTime, getSeverityColor, getStatusBadgeColor } from "@/lib/index";
import type { KPICard, Alert } from "@/lib/index";

interface StatsCardProps {
  kpi: KPICard;
}

export function StatsCard({ kpi }: StatsCardProps) {
  const trendColor = kpi.trendDirection === "up" ? "text-green-600" : "text-red-600";
  const TrendIcon = kpi.trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {kpi.title}
          </CardTitle>
          {kpi.icon && (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <kpi.icon className="h-5 w-5" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
          <div className="flex items-center gap-2 mt-2">
            {kpi.trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                <span>{Math.abs(kpi.trend)}%</span>
              </div>
            )}
            {kpi.period && (
              <p className="text-xs text-muted-foreground">{kpi.period}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

export function MetricCard({ label, value, icon, color = "bg-primary" }: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {icon && (
        <div className={`h-10 w-10 rounded-lg ${color}/10 flex items-center justify-center`}>
          <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  onAction?: (alertId: string) => void;
}

export function AlertCard({ alert, onAction }: AlertCardProps) {
  const severityIcons = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const SeverityIcon = severityIcons[alert.severity];
  const severityColor = getSeverityColor(alert.severity);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-l-4" style={{ borderLeftColor: alert.severity === 'critical' ? 'hsl(var(--destructive))' : alert.severity === 'warning' ? '#ca8a04' : '#2563eb' }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <SeverityIcon className={`h-5 w-5 mt-0.5 ${severityColor}`} />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <Badge variant={getStatusBadgeColor(alert.severity)} className="mt-1">
                    {alert.severity === 'critical' ? 'Critique' : alert.severity === 'warning' ? 'Attention' : 'Info'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(alert.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              {alert.actionRequired && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction?.(alert.id)}
                  >
                    {alert.actionRequired}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SchoolRankCardProps {
  rank: number;
  schoolName: string;
  performanceScore: number;
  trend?: number;
  trendDirection?: 'up' | 'down';
  region?: string;
}

export function SchoolRankCard({
  rank,
  schoolName,
  performanceScore,
  trend,
  trendDirection,
  region,
}: SchoolRankCardProps) {
  const trendColor = trendDirection === "up" ? "text-green-600" : "text-red-600";
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white";
    if (rank === 2) return "bg-gray-400 text-white";
    if (rank === 3) return "bg-amber-700 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankBadgeColor(rank)}`}>
              #{rank}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base">{schoolName}</h4>
              {region && (
                <p className="text-xs text-muted-foreground">{region}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {performanceScore.toFixed(1)}
              </div>
              {trend !== undefined && trendDirection && (
                <div className={`flex items-center justify-end gap-1 text-xs font-medium ${trendColor} mt-1`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend)}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}