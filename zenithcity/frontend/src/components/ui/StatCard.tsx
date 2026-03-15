import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  sub?: string;
}

export default function StatCard({ label, value, icon: Icon, color = 'text-neon-cyan', sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-space-400 uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
      {sub && <p className="text-xs text-space-500">{sub}</p>}
    </div>
  );
}
