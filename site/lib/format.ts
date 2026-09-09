// Presentation formatters safe to import from client components (no DB imports).

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
