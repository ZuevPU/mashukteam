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

interface ExportOption {
  endpoint: string;
  filename: string;
  label: string;
  exportType: string;
}

export const AdminExportScreen: React.FC<AdminExportScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportOption | null>(null);
  
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

  // Открывает popup с выбором способа экспорта
  const openExportModal = (endpoint: string, filename: string, label: string, exportType: string) => {
    if (exporting) {
      showAlert('Экспорт уже выполняется, подождите...');
      return;
    }
    setSelectedExport({ endpoint, filename, label, exportType });
    setShowExportModal(true);
  };

  // Скачивание файла (старый функционал)
  const handleDownload = async () => {
    if (!initData || !selectedExport) {
      showAlert('Ошибка авторизации');
      return;
    }

    setShowExportModal(false);
    setExporting(selectedExport.label);

    try {
      const filtersToSend: any = {};
      if (filters.dateFrom) filtersToSend.dateFrom = filters.dateFrom;
      if (filters.dateTo) filtersToSend.dateTo = filters.dateTo;
      if (filters.direction) filtersToSend.direction = filters.direction;
      if (filters.eventId) filtersToSend.eventId = filters.eventId;

      const response = await fetch(buildApiEndpoint(selectedExport.endpoint), {
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
      a.download = `${selectedExport.filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showAlert(`Экспорт "${selectedExport.label}" завершен`);
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setExporting(null);
      setSelectedExport(null);
    }
  };

  // Отправка в Telegram (новый функционал)
  const handleSendToTelegram = async () => {
    if (!initData || !selectedExport) {
      showAlert('Ошибка авторизации');
      return;
    }

    setShowExportModal(false);
    setExporting(selectedExport.label);

    try {
      const filtersToSend: any = {};
      if (filters.dateFrom) filtersToSend.dateFrom = filters.dateFrom;
      if (filters.dateTo) filtersToSend.dateTo = filters.dateTo;
      if (filters.direction) filtersToSend.direction = filters.direction;
      if (filters.eventId) filtersToSend.eventId = filters.eventId;

      const response = await fetch(buildApiEndpoint('/admin/export/send-telegram'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          initData, 
          exportType: selectedExport.exportType,
          ...filtersToSend 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка отправки');
      }
      
      showAlert('Отчёт отправлен в Telegram');
    } catch (error: any) {
      console.error('Send to Telegram error:', error);
      showAlert(`Ошибка: ${error.message || 'Не удалось отправить в Telegram'}`);
    } finally {
      setExporting(null);
      setSelectedExport(null);
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
            onClick={() => openExportModal('/admin/export/full', 'mashuk_full_export', 'Полный экспорт', 'full')}
            disabled={!!exporting}
          >
            {exporting === 'Полный экспорт' ? '⏳ Экспорт...' : '📥 Экспорт'}
          </button>
        </div>

        <div className="settings-section">
          <h4>Экспорт по категориям</h4>
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
            Выборочный экспорт отдельных категорий данных с учетом фильтров
          </p>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/users', 'users_export', 'Пользователи', 'users')}
            disabled={!!exporting}
          >
            {exporting === 'Пользователи' ? 'Экспорт...' : '👥 Экспорт пользователей'}
          </button>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/answers', 'answers_export', 'Ответы', 'answers')}
            disabled={!!exporting}
          >
            {exporting === 'Ответы' ? 'Экспорт...' : '💬 Экспорт ответов'}
          </button>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/events', 'events_export', 'Программы', 'events')}
            disabled={!!exporting}
          >
            {exporting === 'Программы' ? 'Экспорт...' : '📅 Экспорт программ'}
          </button>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/diagnostics', 'diagnostics_export', 'Диагностики', 'diagnostics')}
            disabled={!!exporting}
          >
            {exporting === 'Диагностики' ? 'Экспорт...' : '📊 Экспорт диагностик'}
          </button>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/assignments', 'assignments_export', 'Задания', 'assignments')}
            disabled={!!exporting}
          >
            {exporting === 'Задания' ? 'Экспорт...' : '📝 Экспорт заданий'}
          </button>
          <button
            className="create-btn"
            onClick={() => openExportModal('/admin/export/questions', 'questions_export', 'Вопросы', 'questions')}
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
            onClick={() => openExportModal('/admin/export/all', 'raw_tables_export', 'Сырые таблицы', 'all')}
            disabled={!!exporting}
          >
            {exporting === 'Сырые таблицы' ? 'Экспорт...' : '🗄️ Экспорт сырых таблиц БД'}
          </button>
        </div>
      </div>

      {/* Popup выбора способа экспорта */}
      {showExportModal && selectedExport && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Экспорт: {selectedExport.label}</h4>
            <p className="export-modal-desc">Выберите способ получения отчёта</p>
            
            <button 
              className="export-modal-btn export-modal-btn-download"
              onClick={handleDownload}
            >
              📥 Скачать файл
            </button>
            
            <button 
              className="export-modal-btn export-modal-btn-telegram"
              onClick={handleSendToTelegram}
            >
              📨 Отправить в Telegram
            </button>
            
            <button 
              className="export-modal-btn export-modal-btn-cancel"
              onClick={() => setShowExportModal(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
