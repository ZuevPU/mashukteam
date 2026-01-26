import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from './errorHandler';

/**
 * Простая валидация через функции-предикаты
 * Для более сложных случаев можно использовать zod или joi
 */

interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
}

/**
 * Middleware для валидации тела запроса
 */
export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];
      
      if (!rule.validator(value)) {
        errors.push(rule.message);
      }
    }

    if (errors.length > 0) {
      return next(new AppError(
        ErrorType.VALIDATION,
        'Ошибка валидации данных',
        400,
        { errors }
      ));
    }

    next();
  };
}

/**
 * Вспомогательные функции валидации
 */
export const validators = {
  required: (value: any): boolean => {
    return value !== undefined && value !== null && value !== '';
  },
  
  isString: (value: any): boolean => {
    return typeof value === 'string';
  },
  
  isNumber: (value: any): boolean => {
    return typeof value === 'number' && !isNaN(value);
  },
  
  minLength: (min: number) => (value: any): boolean => {
    return typeof value === 'string' && value.length >= min;
  },
  
  maxLength: (max: number) => (value: any): boolean => {
    return typeof value === 'string' && value.length <= max;
  },
  
  isPositive: (value: any): boolean => {
    return typeof value === 'number' && value > 0;
  },
  
  isUUID: (value: any): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === 'string' && uuidRegex.test(value);
  },
};
