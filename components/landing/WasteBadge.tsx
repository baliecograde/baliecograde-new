import type { WasteCategory } from '@/types/waste';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';

interface WasteBadgeProps {
  category: WasteCategory;
  size?: 'md' | 'lg';
}

const SIZE_CLASSES = {
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

export function WasteBadge({ category, size = 'md' }: WasteBadgeProps) {
  const meta = WASTE_CATEGORIES[category];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold shadow-sm ${SIZE_CLASSES[size]} ${meta.badgeClass}`}
    >
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
