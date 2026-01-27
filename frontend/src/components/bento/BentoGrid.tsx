import { ReactNode } from 'react';
import './BentoGrid.css';

export type BentoGridSize = '1x1' | '2x1' | '1x2' | '2x2';

export interface BentoGridItem {
  id: string;
  content: ReactNode;
  size: BentoGridSize;
}

interface BentoGridProps {
  items: BentoGridItem[];
  className?: string;
}

/**
 * Компонент сетки Bento-меню с адаптивной сеткой
 */
export function BentoGrid({ items, className = '' }: BentoGridProps) {
  return (
    <div className={`bento-grid ${className}`}>
      {items.map(item => (
        <div
          key={item.id}
          className={`bento-grid-item bento-grid-item-${item.size}`}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
