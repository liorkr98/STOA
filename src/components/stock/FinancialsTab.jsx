import { useState, useEffect } from "react";
import { fetchFinancials, fmtFin, fmtPerShare } from "@/lib/stockData";
import { Loader2 } from "lucide-react";

// Yahoo's quoteSummary returns slightly different field names depending on
// the company, the industry, and which feed version is serving the request
// — totalLiab vs totalLiabilities, cash vs cashAndCashEquivalents, etc.
// Each row carries a list of candidate keys; we read the first one that
// produces a numeric value. This is what fixes Gross Profit / Balance
// Sheet rendering blank for tickers whose Yahoo response uses the alt
// field names.
const INCOME_ROWS = [
  { label: "Total Revenue",    keys: ["totalRevenue"] },
  { label: "Cost of Revenue",  keys: ["costOfRevenue"] },
  { label: "Gross Profit",     keys: ["grossProfit"], derive: (s) => firstNum(s, "totalRevenue") - firstNum(s, "costOfRevenue") },
  { label: "Operating Income", keys: ["operatingIncome", "operatingIncomeOrLoss"] },
  { label: "EBITDA",           keys: ["ebitda", "normalizedEBITDA"] },
  { label: "Net Income",       keys: ["netIncome", "netIncomeApplicableToCommonShares", "netIncomeFromContinuingOps"] },
  { label: "Basic EPS",        keys: ["basicEPS", "earningsPerShare"], format: "perShare" },
];

const BALANCE_ROWS = [
  { label: "Total Assets",       keys: ["totalAssets"] },
  { label: "Total Liabilities",  keys: ["totalLiab", "totalLiabilities", "totalLiabilitiesNetMinorityInterest"] },
  { label: "Stockholder Equity", keys: ["totalStockholderEquity", "stockholdersEquity", "commonStockEquity"] },
  { label: "Cash & Equivalents", keys: ["cash", "cashAndCashEquivalents", "cashAndCashEquivalentsAtCarryingValue", "cashFinancial"] },
  { label: "Short Term Debt",    keys: ["shortLongTermDebt", "shortTermDebt", "currentDebt"] },
  { label: "Long Term Debt",     keys: ["longTermDebt", "longTermDebtNoncurrent"] },
];

const CASHFLOW_ROWS = [
  { label: "Operating Cash Flow",  keys: ["totalCashFromOperatingActivities", "operatingCashFlow"] },
  { label: "Capital Expenditures", keys: ["capitalExpenditures", "capitalExpenditure"] },
  { label: "Free Cash Flow",       keys: ["freeCashFlow"], derive: (s) => firstNum(s, "totalCashFromOperatingActivities", "operatingCashFlow") + firstNum(s, "capitalExpenditures", "capitalExpenditure") },
  { label: "Investing Activities", keys: ["totalCashFromInvestingActivities", "investingCashFlow"] },
  { label: "Financing Activities", keys: ["totalCashFromFinancingActivities", "financingCashFlow"] },
];

// Pick the first present numeric value across a list of candidate keys.
// Yahoo encodes numbers as either bare values or { raw, fmt, longFmt }.
function pickValue(statement, keys) {
  if (!statement) return null;
  for (const k of keys) {
    const v = statement[k];
    if (v == null) continue;
    const raw = typeof v === "object" ? v.raw : v;
    if (typeof raw === "number" && isFinite(raw)) return v;
  }
  return null;
}

// Helper used by `derive` fns above — returns 0 for missing values so
// arithmetic doesn't NaN out when only one operand is present.
function firstNum(statement, ...keys) {
  const v = pickValue(statement, keys);
  if (v == null) return 0;
  return typeof v === "object" ? v.raw : v;
}

function FinTable({ title, rows, statements }) {
  if (!statements?.length) return null;
  const cols = statements.slice(0, 3);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-border bg-secondary/30">
        <h3 className="font-medium text-sm">{title}</h3>
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
              <tr key={row.label} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-2.5 text-xs text-muted-foreground">{row.label}</td>
                {cols.map((s, i) => {
                  let val = pickValue(s, row.keys);
                  // If the direct keys missed, try the derive function (e.g.
                  // Gross Profit = Revenue − Cost of Revenue, Free Cash Flow
                  // = Operating Cash Flow + CapEx) so we don't show $0 on
                  // companies whose Yahoo feed omits the precomputed field.
                  if (val == null && typeof row.derive === "function") {
                    const computed = row.derive(s);
                    if (typeof computed === "number" && isFinite(computed) && computed !== 0) val = computed;
                  }
                  const raw = typeof val === "object" && val ? val.raw : val;
                  const isNeg = typeof raw === "number" && raw < 0;
                  const formatted = row.format === "perShare" ? fmtPerShare(val) : fmtFin(val);
                  return (
                    <td key={i} className={`px-5 py-2.5 text-right text-xs font-medium tabular-nums ${isNeg ? "text-loss" : "text-foreground"}`}>
                      {formatted}
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