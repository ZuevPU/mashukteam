import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = '#3E529B',
  label,
  showPercentage = true,
}) => {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-bar-container">
      {label && (
        <div className="progress-bar-label">
          <span>{label}</span>
          {showPercentage && <span className="progress-bar-percentage">{percentage.toFixed(1)}%</span>}
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {!label && showPercentage && (
        <div className="progress-bar-percentage-right">{percentage.toFixed(1)}%</div>
      )}
    </div>
  );
};
