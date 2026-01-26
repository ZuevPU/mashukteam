import React from 'react';
import { PointsTransaction } from '../../types';
import './PointsHistory.css';

interface PointsHistoryProps {
  transactions: PointsTransaction[];
  className?: string;
}

/**
 * Компонент истории начисления/списания баллов
 */
export function PointsHistory({ transactions, className = '' }: PointsHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (transactions.length === 0) {
    return (
      <div className={`points-history ${className}`}>
        <div className="points-history-empty">
          <p>История баллов пуста</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`points-history ${className}`}>
      <h3 className="points-history-title">История баллов</h3>
      <div className="points-history-list">
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className={`points-history-item ${transaction.points >= 0 ? 'points-positive' : 'points-negative'}`}
          >
            <div className="points-history-main">
              <div className="points-history-amount">
                {transaction.points >= 0 ? '+' : ''}
                {transaction.points}
              </div>
              <div className="points-history-info">
                <div className="points-history-reason">
                  {transaction.reason || 'Без указания причины'}
                </div>
                <div className="points-history-date">
                  {formatDate(transaction.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
