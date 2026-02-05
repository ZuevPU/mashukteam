import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import './TeamMembers.css';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  reflection_level?: number;
  total_stars?: number;
}

interface TeamMembersProps {
  userId: string;
  onMemberClick?: (memberId: string) => void;
}

// Эмодзи уровней рефлексии
const levelEmojis = ['🌱', '🌿', '🌳', '🌲', '🏔️'];

export const TeamMembers: React.FC<TeamMembersProps> = ({ userId, onMemberClick }) => {
  const { initData } = useTelegram();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!initData || !userId) return;

      setLoading(true);
      setError(null);

      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${API_URL}/api/social/team-members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, userId }),
        });

        const data = await response.json();

        if (data.success) {
          setMembers(data.members || []);
          setTeam(data.team || null);
        } else {
          setError(data.error || 'Ошибка загрузки участников');
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Ошибка соединения');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [initData, userId]);

  if (loading) {
    return (
      <div className="team-members team-members--loading">
        <div className="team-members__skeleton">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="member-skeleton">
              <div className="member-skeleton__avatar" />
              <div className="member-skeleton__name" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-members team-members--error">
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!team || members.length === 0) {
    return (
      <div className="team-members team-members--empty">
        <span>🏷️ Команда не назначена</span>
      </div>
    );
  }

  return (
    <div className="team-members">
      <div className="team-members__header">
        <h3 className="team-members__title">🏷️ {team}</h3>
        <span className="team-members__count">{members.length} участников</span>
      </div>
      
      <div className="team-members__list">
        {members.map((member, index) => (
          <div 
            key={member.id} 
            className="team-member"
            onClick={() => onMemberClick?.(member.id)}
          >
            <div className="team-member__rank">
              {index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}`}
            </div>
            
            <div className="team-member__avatar">
              {member.first_name.charAt(0)}{member.last_name.charAt(0)}
            </div>
            
            <div className="team-member__info">
              <div className="team-member__name">
                {member.first_name} {member.last_name}
              </div>
              <div className="team-member__stats">
                {member.reflection_level !== undefined && (
                  <span className="team-member__level">
                    {levelEmojis[member.reflection_level] || '🌱'} Ур. {member.reflection_level + 1}
                  </span>
                )}
              </div>
            </div>
            
            <div className="team-member__stars">
              ⭐ {member.total_stars || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamMembers;
