/** True when `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL` is unset or empty — local JSON fixture, not remote REST. */
export function isWhatIfFixtureMode(): boolean {
  const u = process.env.NEXT_PUBLIC_WHAT_IF_MARKET_API_URL;
  if (u == null || u === "") return true;
  return u.trim() === "";
}
