import React, { useEffect, useState } from 'react';
import { User } from '../../types';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      if (!initData) return;
      try {
        const data = await adminApi.getAllUsers(initData);
        setUsers(data);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [initData]);

  const filteredUsers = users.filter(u => 
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Пользователи ({users.length})</h3>
      </div>

      <div className="form-group" style={{marginBottom: 20}}>
        <input 
          className="form-input"
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-list">
        {filteredUsers.map((user) => (
          <div key={user.id} className="admin-item-card" onClick={() => onUserClick(user.id)}>
            <div className="item-info">
              <h4>{user.first_name} {user.last_name}</h4>
              <p>@{user.telegram_username || 'no_username'} • {user.status}</p>
            </div>
            <div className="item-actions">
              <span style={{fontSize: 20}}>➡️</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
