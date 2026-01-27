import React, { useEffect, useState } from 'react';
import { User, UserType } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminUsersScreenProps {
  onBack: () => void;
  onUserClick: (userId: string) => void;
}

export const AdminUsersScreen: React.FC<AdminUsersScreenProps> = ({ onBack, onUserClick }) => {
  const { initData } = useTelegram();
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      if (!initData) return;
      try {
        const [usersData, typesData] = await Promise.all([
          adminApi.getAllUsers(initData),
          adminApi.getUserTypes()
        ]);
        setUsers(usersData);
        setUserTypes(typesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initData]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.first_name.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.telegram_username?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === 'all' || u.user_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Count users by type
  const typeCounts = userTypes.map(t => ({
    ...t,
    count: users.filter(u => u.user_type === t.slug).length
  }));
  const noTypeCount = users.filter(u => !u.user_type).length;

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Пользователи ({users.length})</h3>
      </div>

      <div className="form-group" style={{marginBottom: 12}}>
        <input 
          className="form-input"
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="form-group" style={{marginBottom: 20}}>
        <select 
          className="form-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Все типы ({users.length})</option>
          <option value="">Без типа ({noTypeCount})</option>
          {typeCounts.map(t => (
            <option key={t.id} value={t.slug}>{t.name} ({t.count})</option>
          ))}
        </select>
      </div>

      <div className="admin-list">
        {filteredUsers.length === 0 ? (
          <p className="no-data">Пользователи не найдены</p>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="admin-item-card" onClick={() => onUserClick(user.id)} style={{cursor: 'pointer'}}>
              <div className="item-info">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                  {user.user_type && (
                    <span className="status-badge diagnostic">
                      {userTypes.find(t => t.slug === user.user_type)?.name || user.user_type}
                    </span>
                  )}
                  <span className={`status-badge ${user.status === 'registered' ? 'published' : 'draft'}`}>
                    {user.status}
                  </span>
                </div>
                <h4>{user.first_name} {user.last_name}</h4>
                <p>@{user.telegram_username || 'no_username'}</p>
              </div>
              <span style={{fontSize: 18, opacity: 0.5}}>→</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
