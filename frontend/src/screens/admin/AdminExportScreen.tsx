import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import { Direction, Event } from '../../types';
import './AdminScreens.css';

interface AdminExportScreenProps {
  onBack: () => void;
}

interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  direction?: string;
  eventId?: string;
}

export const AdminExportScreen: React.FC<AdminExportScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: '',
    dateTo: '',
    direction: '',
    eventId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [directionsRes, eventsRes] = await Promise.all([
        fetch(buildApiEndpoint('/directions')).then(r => r.json()),
        fetch(buildApiEndpoint('/events/list'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        }).then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      setDirections(directionsRes.directions || []);
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
      if (filters.direction) filtersToSend.direction = filters.direction;
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

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.direction || filters.eventId;

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      direction: '',
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
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            >
              <option value="">Все направления</option>
              {directions.map((dir) => (
                <option key={dir.id} value={dir.slug}>
                  {dir.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Программа:</label>
            <select
              value={filters.eventId}
              onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
            >
              <option value="">Все программы</option>
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
              {filters.direction && <li>Направление: {directions.find(d => d.slug === filters.direction)?.name}</li>}
              {filters.eventId && <li>Программа: {events.find(e => e.id === filters.eventId)?.title}</li>}
            </ul>
          </div>
        )}

        <div className="settings-section" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <h4 style={{ color: '#fff', marginBottom: '12px' }}>📦 Полный экспорт приложения</h4>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
            Экспорт всех данных приложения в один Excel файл с 21 листом: пользователи, программы, задания, ответы, рассылки, рандомайзеры и др.
          </p>
          <button
            className="create-btn"
            style={{ background: '#fff', color: '#764ba2', fontWeight: 'bold', width: '100%' }}
            onClick={() => handleExport('/admin/export/full', 'mashuk_full_export', 'Полный экспорт')}
            disabled={!!exporting}
          >
            {exporting === 'Полный экспорт' ? '⏳ Экспорт...' : '📥 Скачать полный экспорт'}
          </button>
        </div>

        <div className="settings-section">
          <h4>Экспорт по категориям</h4>
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
            Выборочный экспорт отдельных категорий данных с учетом фильтров
          </p>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/users', 'users_export', 'Пользователи')}
            disabled={!!exporting}
          >
            {exporting === 'Пользователи' ? 'Экспорт...' : '👥 Экспорт пользователей'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/answers', 'answers_export', 'Ответы')}
            disabled={!!exporting}
          >
            {exporting === 'Ответы' ? 'Экспорт...' : '💬 Экспорт ответов'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/events', 'events_export', 'Программы')}
            disabled={!!exporting}
          >
            {exporting === 'Программы' ? 'Экспорт...' : '📅 Экспорт программ'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/diagnostics', 'diagnostics_export', 'Диагностики')}
            disabled={!!exporting}
          >
            {exporting === 'Диагностики' ? 'Экспорт...' : '📊 Экспорт диагностик'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/assignments', 'assignments_export', 'Задания')}
            disabled={!!exporting}
          >
            {exporting === 'Задания' ? 'Экспорт...' : '📝 Экспорт заданий'}
          </button>
          <button
            className="create-btn"
            onClick={() => handleExport('/admin/export/questions', 'questions_export', 'Вопросы')}
            disabled={!!exporting}
          >
            {exporting === 'Вопросы' ? 'Экспорт...' : '❓ Экспорт вопросов'}
          </button>
        </div>

        <div className="settings-section">
          <h4>Технический экспорт</h4>
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
            Сырой экспорт всех таблиц базы данных (для разработчиков)
          </p>
          <button
            className="create-btn"
            style={{ background: '#666' }}
            onClick={() => handleExport('/admin/export/all', 'raw_tables_export', 'Сырые таблицы')}
            disabled={!!exporting}
          >
            {exporting === 'Сырые таблицы' ? 'Экспорт...' : '🗄️ Экспорт сырых таблиц БД'}
          </button>
        </div>
      </div>
    </div>
  );
};
