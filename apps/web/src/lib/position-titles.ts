export const POSITION_TITLES = [
  "NACOS President",
  "NACOS Vice President",
  "General Secretary",
  "Assistant General Secretary",
  "Financial Secretary",
  "Treasurer",
  "Public Relations Officer (PRO)",
  "Welfare Director",
  "Director of Socials",
  "Director of Sports",
  "Director of ICT/Technical",
  "Director of Academics",
] as const;

export type PositionTitle = (typeof POSITION_TITLES)[number];

export function isPositionTitle(value: string): value is PositionTitle {
  return POSITION_TITLES.some((title) => title === value);
}
