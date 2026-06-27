import { type ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "green" | "brown" | "mint";
  loading?: boolean;
}

export default function StatCard({ title, value, sub, icon, accent = "green", loading }: Props) {
  const accentClasses = {
    green: "bg-zena-green-light/10 text-zena-green-mid",
    mint: "bg-zena-mint/40 text-zena-green-dark",
    brown: "bg-zena-brown/10 text-zena-brown",
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30 animate-pulse">
        <div className="h-4 bg-zena-mint/40 rounded w-24 mb-3" />
        <div className="h-8 bg-zena-mint/40 rounded w-32 mb-2" />
        <div className="h-3 bg-zena-mint/20 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-zena-text-light text-sm font-medium">{title}</p>
        {icon && (
          <div className={`p-2 rounded-xl ${accentClasses[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-zena-text-dark font-mono-data">{value}</p>
      {sub && <p className="text-zena-text-light text-xs mt-1">{sub}</p>}
    </div>
  );
}
