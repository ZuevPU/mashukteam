import React, { useState, useRef } from 'react';
import { Assignment } from '../../types';
import { assignmentApi } from '../../services/assignmentApi';
import { uploadApi } from '../../services/uploadApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AssignmentsScreen.css';

interface AssignmentSubmitScreenProps {
  assignment: Assignment;
  onBack: () => void;
  onSuccess: () => void;
}

export const AssignmentSubmitScreen: React.FC<AssignmentSubmitScreenProps> = ({ 
  assignment, onBack, onSuccess 
}) => {
  const { initData, showAlert } = useTelegram();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  
  // Для загрузки фото
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Неподдерживаемый формат. Разрешены: JPEG, PNG, GIF, WebP');
      return;
    }

    // Проверка размера (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showAlert('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Создаем превью
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!initData) return;
    
    // Валидация для обычных форматов
    if (assignment.answer_format !== 'photo_upload' && !content.trim()) {
      showAlert('Введите ответ');
      return;
    }

    // Валидация для фото
    if (assignment.answer_format === 'photo_upload' && !selectedFile) {
      showAlert('Загрузите фото');
      return;
    }

    // Validate format
    if (assignment.answer_format === 'number' && isNaN(Number(content))) {
      showAlert('Введите число');
      return;
    }
    if (assignment.answer_format === 'link' && !content.startsWith('http')) {
      showAlert('Введите корректную ссылку (начинается с http)');
      return;
    }

    setLoading(true);
    try {
      let fileUrl: string | undefined;

      // Если это загрузка фото, сначала загружаем файл
      if (assignment.answer_format === 'photo_upload' && selectedFile) {
        setUploadProgress(true);
        try {
          const uploadResult = await uploadApi.uploadTaskFile(selectedFile, assignment.id, initData);
          fileUrl = uploadResult.file_url;
        } catch (uploadError: any) {
          showAlert(uploadError.message || 'Ошибка загрузки файла');
          setLoading(false);
          setUploadProgress(false);
          return;
        }
        setUploadProgress(false);
      }

      // Отправляем submission
      const submissionContent = assignment.answer_format === 'photo_upload' 
        ? (selectedFile?.name || 'photo') 
        : content;
      
      await assignmentApi.submitAssignment(assignment.id, submissionContent, initData, fileUrl);
      showAlert('Ответ отправлен на проверку!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting:', error);
      showAlert(error.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  const getInputLabel = () => {
    switch (assignment.answer_format) {
      case 'text': return 'Ваш ответ:';
      case 'number': return 'Введите число:';
      case 'link': return 'Вставьте ссылку:';
      case 'photo_upload': return 'Загрузите фото:';
      default: return 'Ваш ответ:';
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (assignment.answer_format === 'photo_upload') {
      return !selectedFile;
    }
    return !content.trim();
  };

  return (
    <div className="assignments-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Выполнить задание</h3>
      </div>

      <div className="assignment-detail">
        <div className="reward-badge large">⭐ {assignment.reward} звездочек</div>
        
        <h2>{assignment.title}</h2>
        
        {assignment.description && (
          <p className="description full">{assignment.description}</p>
        )}

        <div className="input-section">
          <label>{getInputLabel()}</label>
          
          {assignment.answer_format === 'photo_upload' ? (
            <div className="photo-upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {previewUrl ? (
                <div className="photo-preview-container">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="photo-preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                    }}
                  />
                  <button 
                    className="remove-photo-btn"
                    onClick={handleRemoveFile}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Удалить фото
                  </button>
                </div>
              ) : (
                <button 
                  className="select-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '40px 20px',
                    background: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
                    border: '2px dashed var(--tg-theme-hint-color, #999)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: 'var(--tg-theme-hint-color, #666)',
                  }}
                >
                  📷 Нажмите, чтобы выбрать фото
                  <br />
                  <small style={{ fontSize: '12px', opacity: 0.7 }}>
                    JPEG, PNG, GIF, WebP до 10MB
                  </small>
                </button>
              )}
              
              {selectedFile && (
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '8px' }}>
                  Выбран файл: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          ) : assignment.answer_format === 'text' ? (
            <textarea 
              className="input-text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Напишите ваш ответ..."
              rows={5}
            />
          ) : (
            <input 
              type={assignment.answer_format === 'number' ? 'number' : 'url'}
              className="input-field"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={assignment.answer_format === 'number' ? '0' : 'https://...'}
            />
          )}
        </div>

        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
        >
          {uploadProgress ? 'Загрузка фото...' : loading ? 'Отправка...' : 'Отправить на проверку'}
        </button>
      </div>
    </div>
  );
};
