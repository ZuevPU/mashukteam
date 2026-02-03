import React from 'react';
import './NeighborCard.css';

interface NeighborCardProps {
  onClick?: () => void;
}

export const NeighborCard: React.FC<NeighborCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card neighbor-card" onClick={onClick}>
      <div className="neighbor-content">
        <img src="/img/man.png" alt="Персонаж" className="neighbor-image" />
        <div className="neighbor-text">
          <h3 className="neighbor-title">Твой дружелюбный сосед</h3>
          <p className="neighbor-subtitle">Коротко обо мне</p>
          <p className="neighbor-description">
            Я рядом на протяжении всей программы и помогаю не потерять важное в общем потоке событий.
          </p>
        </div>
      </div>
    </div>
  );
};
