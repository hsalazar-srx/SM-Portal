// src/components/supply-chain/WorkbenchCards.tsx
// Uses skill: architecture/ui-ux-best-practices
import { StatsCard } from '@/components/ui/stats';
import type { CardKey, Summary } from '@/services/supplyChainService';
import { CARDS, cardValue, openLinesValue } from './cards';

const BUTTON =
  'block w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
// h-full makes every card as tall as the tallest in its row; the label is given two lines of height so that a
// one-line label ("NG") and a two-line one ("Overdue to order") put their numbers at the same height.
const CARD = 'h-full [&_p:first-child]:min-h-[2rem]';
const SELECTED = `${CARD} ring-2 ring-primary-600 shadow-md`;

/**
 * The cards: each a one-click filter on the list below. The first shows every open line; clicking the active card
 * again goes back to it. A count shows a dash while the summary loads, or when MOVEX could not be read.
 */
export default function WorkbenchCards({
  summary, active, onToggle, onShowAll,
}: {
  summary: Summary | null;
  active: CardKey | null;
  onToggle: (card: CardKey) => void;
  onShowAll: () => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-md items-stretch">
      <button type="button" className={BUTTON} aria-pressed={active === null} onClick={onShowAll}
        title="Every open line you can see">
        <StatsCard label="All open lines" value={openLinesValue(summary)} color="primary"
          className={active === null ? SELECTED : CARD} />
      </button>

      {CARDS.map(card => (
        <button key={card.key} type="button" className={BUTTON} aria-pressed={active === card.key}
          onClick={() => onToggle(card.key)} title={card.hint}>
          <StatsCard label={card.label} value={cardValue(summary, card.key)} color={card.color}
            className={active === card.key ? SELECTED : CARD} />
        </button>
      ))}
    </div>
  );
}
