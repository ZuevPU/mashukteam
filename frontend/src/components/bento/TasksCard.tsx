import React from 'react';
import './TasksCard.css';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  pointsReward?: number;
}

interface TasksCardProps {
  tasks?: Task[];
  className?: string;
}

/**
 * Компонент карточки заданий/активностей
 * TODO: Реализовать интеграцию с системой заданий
 */
export function TasksCard({ tasks = [], className = '' }: TasksCardProps) {
  // Заглушка для будущей реализации
  const mockTasks: Task[] = tasks.length > 0 ? tasks : [
    {
      id: '1',
      title: 'Завершить регистрацию',
      description: 'Заполните все поля профиля',
      completed: true,
      pointsReward: 100,
    },
    {
      id: '2',
      title: 'Получить первое достижение',
      description: 'Разблокируйте любое достижение',
      completed: false,
      pointsReward: 50,
    },
  ];

  return (
    <div className={`tasks-card ${className}`}>
      <h3 className="tasks-card-title">Задания</h3>
      <div className="tasks-list">
        {mockTasks.map(task => (
          <div
            key={task.id}
            className={`task-item ${task.completed ? 'task-completed' : ''}`}
          >
            <div className="task-checkbox">
              {task.completed ? '✓' : '○'}
            </div>
            <div className="task-content">
              <div className="task-title">{task.title}</div>
              <div className="task-description">{task.description}</div>
              {task.pointsReward && (
                <div className="task-reward">+{task.pointsReward} баллов</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
