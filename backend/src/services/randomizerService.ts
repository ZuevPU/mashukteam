import { supabase } from './supabase';
import { logger } from '../utils/logger';
import {
  RandomizerQuestion,
  RandomizerParticipant,
  RandomizerDistribution,
  CreateRandomizerDto,
} from '../types';

export class RandomizerService {
  /**
   * Создание рандомайзера
   */
  static async createRandomizer(data: CreateRandomizerDto): Promise<RandomizerQuestion> {
    try {
      const { data: randomizer, error } = await supabase
        .from('randomizer_questions')
        .insert({
          question_id: data.question_id,
          tables_count: data.tables_count,
          participants_per_table: data.participants_per_table,
          topic: data.topic,
          description: data.description || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating randomizer', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      return randomizer as RandomizerQuestion;
    } catch (error) {
      logger.error('Error creating randomizer', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Участие пользователя в рандомайзере
   */
  static async participateInRandomizer(
    userId: string,
    randomizerId: string
  ): Promise<RandomizerParticipant> {
    try {
      // Проверяем, что рандомайзер существует и открыт
      const { data: randomizer, error: randomizerError } = await supabase
        .from('randomizer_questions')
        .select('status')
        .eq('id', randomizerId)
        .single();

      if (randomizerError || !randomizer) {
        throw new Error('Рандомайзер не найден');
      }

      if (randomizer.status !== 'open') {
        throw new Error('Рандомайзер закрыт для участия');
      }

      // Проверяем, не участвует ли уже пользователь
      const { data: existing } = await supabase
        .from('randomizer_participants')
        .select('id')
        .eq('randomizer_id', randomizerId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        throw new Error('Вы уже участвуете в этом рандомайзере');
      }

      const { data: participant, error } = await supabase
        .from('randomizer_participants')
        .insert({
          randomizer_id: randomizerId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error participating in randomizer', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      return participant as RandomizerParticipant;
    } catch (error) {
      logger.error('Error participating in randomizer', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Распределение участников по столам
   */
  static async distributeParticipants(randomizerId: string): Promise<RandomizerDistribution[]> {
    try {
      // Получаем данные рандомайзера
      const { data: randomizer, error: randomizerError } = await supabase
        .from('randomizer_questions')
        .select('*')
        .eq('id', randomizerId)
        .single();

      if (randomizerError || !randomizer) {
        throw new Error('Рандомайзер не найден');
      }

      if (randomizer.status === 'distributed') {
        throw new Error('Распределение уже выполнено');
      }

      // Получаем всех участников
      const { data: participants, error: participantsError } = await supabase
        .from('randomizer_participants')
        .select('user_id')
        .eq('randomizer_id', randomizerId);

      if (participantsError) {
        throw participantsError;
      }

      if (!participants || participants.length === 0) {
        throw new Error('Нет участников для распределения');
      }

      // Перемешиваем участников случайным образом
      const shuffledParticipants = [...participants];
      for (let i = shuffledParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
      }

      // Распределяем по столам последовательно
      const distributions: Array<{ randomizer_id: string; user_id: string; table_number: number }> = [];
      const participantsPerTable = randomizer.participants_per_table;
      let currentTable = 1;
      let currentTableCount = 0;

      for (const participant of shuffledParticipants) {
        distributions.push({
          randomizer_id: randomizerId,
          user_id: participant.user_id,
          table_number: currentTable,
        });

        currentTableCount++;
        if (currentTableCount >= participantsPerTable && currentTable < randomizer.tables_count) {
          currentTable++;
          currentTableCount = 0;
        }
      }

      // Сохраняем распределения
      const { data: savedDistributions, error: distributionError } = await supabase
        .from('randomizer_distributions')
        .insert(distributions)
        .select();

      if (distributionError) {
        logger.error('Error saving distributions', distributionError instanceof Error ? distributionError : new Error(String(distributionError)));
        throw distributionError;
      }

      // Обновляем статус рандомайзера
      const { error: updateError } = await supabase
        .from('randomizer_questions')
        .update({
          status: 'distributed',
          distributed_at: new Date().toISOString(),
        })
        .eq('id', randomizerId);

      if (updateError) {
        logger.error('Error updating randomizer status', updateError instanceof Error ? updateError : new Error(String(updateError)));
        throw updateError;
      }

      return (savedDistributions || []) as RandomizerDistribution[];
    } catch (error) {
      logger.error('Error distributing participants', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение данных рандомайзера для пользователя
   */
  static async getRandomizerForUser(
    userId: string,
    randomizerId: string
  ): Promise<{
    randomizer: RandomizerQuestion;
    isParticipant: boolean;
    distribution?: RandomizerDistribution;
    participantsCount: number;
  }> {
    try {
      const { data: randomizer, error: randomizerError } = await supabase
        .from('randomizer_questions')
        .select('*')
        .eq('id', randomizerId)
        .single();

      if (randomizerError || !randomizer) {
        throw new Error('Рандомайзер не найден');
      }

      // Проверяем участие
      const { data: participant } = await supabase
        .from('randomizer_participants')
        .select('id')
        .eq('randomizer_id', randomizerId)
        .eq('user_id', userId)
        .single();

      // Получаем распределение, если есть
      let distribution: RandomizerDistribution | undefined;
      if (randomizer.status === 'distributed') {
        const { data: dist } = await supabase
          .from('randomizer_distributions')
          .select('*')
          .eq('randomizer_id', randomizerId)
          .eq('user_id', userId)
          .single();
        distribution = dist as RandomizerDistribution | undefined;
      }

      // Считаем количество участников
      const { count: participantsCount } = await supabase
        .from('randomizer_participants')
        .select('*', { count: 'exact', head: true })
        .eq('randomizer_id', randomizerId);

      return {
        randomizer: randomizer as RandomizerQuestion,
        isParticipant: !!participant,
        distribution,
        participantsCount: participantsCount || 0,
      };
    } catch (error) {
      logger.error('Error getting randomizer for user', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение всех рандомайзеров пользователя
   */
  static async getUserRandomizers(userId: string): Promise<Array<{
    randomizer: RandomizerQuestion;
    isParticipant: boolean;
    distribution?: RandomizerDistribution;
  }>> {
    try {
      // Получаем все рандомайзеры через вопросы пользователя
      const { data: randomizers, error } = await supabase
        .from('randomizer_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const result = await Promise.all(
        (randomizers || []).map(async (r) => {
          const { data: participant } = await supabase
            .from('randomizer_participants')
            .select('id')
            .eq('randomizer_id', r.id)
            .eq('user_id', userId)
            .single();

          let distribution: RandomizerDistribution | undefined;
          if (r.status === 'distributed') {
            const { data: dist } = await supabase
              .from('randomizer_distributions')
              .select('*')
              .eq('randomizer_id', r.id)
              .eq('user_id', userId)
              .single();
            distribution = dist as RandomizerDistribution | undefined;
          }

          return {
            randomizer: r as RandomizerQuestion,
            isParticipant: !!participant,
            distribution,
          };
        })
      );

      return result;
    } catch (error) {
      logger.error('Error getting user randomizers', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение распределений рандомайзера (для админа)
   */
  static async getRandomizerDistributions(
    randomizerId: string
  ): Promise<Array<RandomizerDistribution & { user: { id: string; first_name: string; last_name: string; middle_name: string | null } }>> {
    try {
      const { data: distributions, error } = await supabase
        .from('randomizer_distributions')
        .select(`
          *,
          user:users(id, first_name, last_name, middle_name)
        `)
        .eq('randomizer_id', randomizerId)
        .order('table_number', { ascending: true });

      if (error) {
        throw error;
      }

      return (distributions || []) as Array<RandomizerDistribution & { user: { id: string; first_name: string; last_name: string; middle_name: string | null } }>;
    } catch (error) {
      logger.error('Error getting randomizer distributions', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение рандомайзера по question_id
   */
  static async getRandomizerByQuestionId(questionId: string): Promise<RandomizerQuestion | null> {
    try {
      const { data: randomizer, error } = await supabase
        .from('randomizer_questions')
        .select('*')
        .eq('question_id', questionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return randomizer as RandomizerQuestion;
    } catch (error) {
      logger.error('Error getting randomizer by question id', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
