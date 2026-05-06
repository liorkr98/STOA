import { useState, useEffect } from "react";
import { fetchFinancials, fmtFin } from "@/lib/stockData";
import { Loader2 } from "lucide-react";

const INCOME_ROWS = [
  { label: "Total Revenue",        key: "totalRevenue" },
  { label: "Gross Profit",         key: "grossProfit" },
  { label: "Operating Income",     key: "operatingIncome" },
  { label: "EBITDA",               key: "ebitda" },
  { label: "Net Income",           key: "netIncome" },
  { label: "Basic EPS",            key: "basicEPS" },
];

const BALANCE_ROWS = [
  { label: "Total Assets",         key: "totalAssets" },
  { label: "Total Liabilities",    key: "totalLiab" },
  { label: "Stockholder Equity",   key: "totalStockholderEquity" },
  { label: "Cash & Equivalents",   key: "cash" },
  { label: "Short Term Debt",      key: "shortLongTermDebt" },
  { label: "Long Term Debt",       key: "longTermDebt" },
];

const CASHFLOW_ROWS = [
  { label: "Operating Cash Flow",  key: "totalCashFromOperatingActivities" },
  { label: "Capital Expenditures", key: "capitalExpenditures" },
  { label: "Free Cash Flow",       key: "freeCashFlow" },
  { label: "Investing Activities", key: "totalCashFromInvestingActivities" },
  { label: "Financing Activities", key: "totalCashFromFinancingActivities" },
];

function FinTable({ title, rows, statements }) {
  if (!statements?.length) return null;
  const cols = statements.slice(0, 3);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-border bg-secondary/30">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
          {cols.map((s, i) => (
            <span key={i}>{s.endDate?.fmt || `Year ${i}`}</span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">Metric</th>
              {cols.map((s, i) => (
                <th key={i} className="text-right px-5 py-2.5 text-xs text-muted-foreground font-medium">
                  {s.endDate?.fmt?.slice(0, 4) || `Y${i}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-2.5 text-xs text-muted-foreground">{row.label}</td>
                {cols.map((s, i) => {
                  const val = s[row.key];
                  const n = val?.raw ?? val;
                  const isNeg = n != null && n < 0;
                  return (
                    <td key={i} className={`px-5 py-2.5 text-right text-xs font-medium tabular-nums ${isNeg ? "text-loss" : "text-foreground"}`}>
                      {fmtFin(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinancialsTab({ ticker }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetchFinancials(ticker)
      .then(setData)
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading financials...
    </div>
  );

  if (!data) return (
    <p className="text-sm text-muted-foreground text-center py-12">No financial data available.</p>
  );

  return (
    <div>
      <FinTable title="Income Statement (Annual)" rows={INCOME_ROWS} statements={data.income} />
      <FinTable title="Balance Sheet (Annual)"    rows={BALANCE_ROWS}  statements={data.balance} />
      <FinTable title="Cash Flow Statement (Annual)" rows={CASHFLOW_ROWS} statements={data.cashflow} />
      {!data.income?.length && !data.balance?.length && !data.cashflow?.length && (
        <p className="text-sm text-muted-foreground text-center py-12">No financial statements available for {ticker}.</p>
      )}
    </div>
  );
}