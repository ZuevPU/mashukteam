import './SettingsCard.css';

interface SettingsCardProps {
  className?: string;
  onSettingsClick?: () => void;
}

/**
 * Компонент карточки настроек
 */
export function SettingsCard({ className = '', onSettingsClick }: SettingsCardProps) {
  return (
    <div className={`settings-card ${className}`}>
      <h3 className="settings-card-title">Настройки</h3>
      <div className="settings-list">
        <button className="settings-item" onClick={onSettingsClick}>
          <span className="settings-item-icon">⚙️</span>
          <span className="settings-item-label">Общие настройки</span>
          <span className="settings-item-arrow">›</span>
        </button>
        <button className="settings-item">
          <span className="settings-item-icon">🔔</span>
          <span className="settings-item-label">Уведомления</span>
          <span className="settings-item-arrow">›</span>
        </button>
        <button className="settings-item">
          <span className="settings-item-icon">🌙</span>
          <span className="settings-item-label">Тема</span>
          <span className="settings-item-arrow">›</span>
        </button>
      </div>
    </div>
  );
}
