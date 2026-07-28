export function formatHour(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatHourRange(start: Date, end: Date): string {
  return `${formatHour(start)}-${formatHour(end)}`;
}

export function formatTimeAgo(fromMs: number, nowMs = Date.now()): string {
  const diffMs = Math.max(0, nowMs - fromMs);
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) return `Atualizado ha ${minutes} min`;
  if (remainingMinutes === 0) return `Atualizado ha ${hours}h`;
  return `Atualizado ha ${hours}h ${remainingMinutes}min`;
}
