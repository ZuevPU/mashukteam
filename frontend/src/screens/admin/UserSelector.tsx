import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './UserSelector.css';

interface UserSelectorProps {
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ selectedUserIds, onChange }) => {
  const { initData } = useTelegram();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
    u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegram_username?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  if (loading) return <div>Загрузка списка...</div>;

  return (
    <div className="user-selector">
      <input 
        className="form-input search-input"
        placeholder="Поиск по имени..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="users-list-scroll">
        {filteredUsers.map(user => (
          <div 
            key={user.id} 
            className={`user-item ${selectedUserIds.includes(user.id) ? 'selected' : ''}`}
            onClick={() => toggleUser(user.id)}
          >
            <div className="user-checkbox">
              {selectedUserIds.includes(user.id) && '✓'}
            </div>
            <div className="user-info-mini">
              <span className="user-name">{user.first_name} {user.last_name}</span>
              <span className="user-login">@{user.telegram_username || 'no_user'}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="selector-summary">
        Выбрано: {selectedUserIds.length}
      </div>
    </div>
  );
};
