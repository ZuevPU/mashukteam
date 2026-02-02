import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import { Direction, UserType, Event } from '../../types';
import './AdminScreens.css';

interface AdminExportScreenProps {
  onBack: () => void;
}

interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  directionId?: string;
  userType?: string;
  eventId?: string;
}

export const AdminExportScreen: React.FC<AdminExportScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: '',
    dateTo: '',
    directionId: '',
    userType: '',
    eventId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [directionsRes, userTypesRes, eventsRes] = await Promise.all([
        fetch(buildApiEndpoint('/directions')).then(r => r.json()),
        fetch(buildApiEndpoint('/user-types')).then(r => r.json()),
        fetch(buildApiEndpoint('/events/list'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        }).then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      setDirections(directionsRes.directions || []);
      setUserTypes(userTypesRes.user_types || []);
      setEvents(eventsRes.events || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleExport = async (endpoint: string, filename: string, label: string) => {
    if (!initData) {
      showAlert('Ошибка авторизации');
      return;
    }

    if (exporting) {
      showAlert('Экспорт уже выполняется, подождите...');
      return;
    }

    setExporting(label);

    try {
      // Формируем фильтры для отправки
      const filtersToSend: any = {};
      if (filters.dateFrom) filtersToSend.dateFrom = filters.dateFrom;
      if (filters.dateTo) filtersToSend.dateTo = filters.dateTo;
      if (filters.directionId) filtersToSend.directionId = filters.directionId;
      if (filters.userType) filtersToSend.userType = filters.userType;
      if (filters.eventId) filtersToSend.eventId = filters.eventId;

      const response = await fetch(buildApiEndpoint(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData, ...filtersToSend })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка экспорта');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showAlert(`Экспорт "${label}" завершен`);
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setExporting(null);
    }
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.directionId || filters.userType || filters.eventId;

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      directionId: '',
      userType: '',
      eventId: '',
    });
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Экспорт с фильтрами</h3>
      </div>

      <div className="admin-list">
        <div className="settings-section">
          <h4>Фильтры экспорта</h4>
          
          <div className="form-group">
            <label>Дата от:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Дата до:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Направление:</label>
            <select
              value={filters.directionId}
              onChange={(e) => setFilters({ ...filters, directionId: e.target.value })}
            >
              <option value="">Все направления</option>
              {directions.map((dir) => (
                <option key={dir.id} value={dir.id}>
                  {dir.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Тип пользователя:</label>
            <select
              value={filters.userType}
              onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
            >
              <option value="">Все типы</option>
              {userTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Мероприятие:</label>
            <select
              value={filters.eventId}
              onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
            >
              <option value="">Все мероприятия</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="create-btn" style={{ marginTop: '12px', background: '#999' }}>
              Очистить фильтры
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="settings-section">
            <h4>Активные фильтры:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {filters.dateFrom && <li>Дата от: {new Date(filters.dateFrom).toLocaleDateString('ru-RU')}</li>}
              {filters.dateTo && <li>Дата до: {new Date(filters.dateTo).toLocaleDateString('ru-RU')}</li>}
              {filters.directionId && <li>Направление: {directions.find(d => d.id === filters.directionId)?.name}</li>}
              {filters.userType && <li>Тип: {userTypes.find(t => t.slug === filters.userType)?.name}</li>}
              {filters.eventId && <li>Мероприятие: {events.find(e => e.id === filters.eventId)?.title}</li>}
            </ul>
          </div>
        )}

        <div className="settings-section">
          <h4>Экспорт данных</h4>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/users', 'users_export', 'Пользователи')}
            disabled={!!exporting}
          >
            {exporting === 'Пользователи' ? 'Экспорт...' : 'Экспорт пользователей'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/answers', 'answers_export', 'Ответы')}
            disabled={!!exporting}
          >
            {exporting === 'Ответы' ? 'Экспорт...' : 'Экспорт ответов'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/events', 'events_export', 'Мероприятия')}
            disabled={!!exporting}
          >
            {exporting === 'Мероприятия' ? 'Экспорт...' : 'Экспорт мероприятий'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/diagnostics', 'diagnostics_export', 'Диагностики')}
            disabled={!!exporting}
          >
            {exporting === 'Диагностики' ? 'Экспорт...' : 'Экспорт диагностик'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/assignments', 'assignments_export', 'Задания')}
            disabled={!!exporting}
          >
            {exporting === 'Задания' ? 'Экспорт...' : 'Экспорт заданий'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/questions', 'questions_export', 'Вопросы')}
            disabled={!!exporting}
          >
            {exporting === 'Вопросы' ? 'Экспорт...' : 'Экспорт вопросов'}
          </button>
        </div>
      </div>
    </div>
  );
};
