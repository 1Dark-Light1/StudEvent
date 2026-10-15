/** Home agenda: the month's tasks grouped by day on a small timeline. */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GlobalEventCard from '../../ui/GlobalEventCard';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function AgendaList({ agenda, participants, onEventPress }) {
   const { displayTime } = useI18n();
   const { colors } = useTheme();

   return (
      <>
         {agenda.map((block) => (
            <View key={block.day} style={styles.agendaBlock}>
               <Text style={[styles.agendaLabel, { color: colors.textMuted }]}>{block.day}</Text>
               {block.items.map((item, idx) => {
                  const isLast = idx === block.items.length - 1;
                  const isGlobal = item.isGlobal === true;
                  // Получаем участников для глобальной задачи
                  const taskParticipants = isGlobal && participants[item.id] ? participants[item.id] : [];

                  // Проверяем, прикреплен ли текущий пользователь к задаче
                  const isUserJoined = isGlobal && auth.currentUser && item.participants && item.participants.includes(auth.currentUser.uid);

                  // Для админских задач используем цвет тага с градиентом
                  const adminTagColor = isGlobal ? (item.color || '#2f7cff') : '#2f7cff';

                  // Создаем более светлую обводку для кружечка админской задачи
                  // Используем тот же цвет с увеличенной прозрачностью для эффекта осветления
                  // Для обводки используем цвет с добавлением белого через opacity
                  const lightBorderColor = isGlobal ? adminTagColor + 'CC' : null;

                  return (
                     <Pressable
                        key={`${block.day}-${item.time}-${item.title}-${item.id}`}
                        style={styles.agendaRow}
                        onPress={() => onEventPress(item)}
                     >
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>{displayTime(item.time)}</Text>
                        <View style={styles.timeline}>
                           <View 
                              style={[
                                 styles.bullet, 
                                 { backgroundColor: isGlobal ? adminTagColor : item.color },
                                 isGlobal && [
                                    styles.bulletGlobal,
                                    lightBorderColor && { borderColor: lightBorderColor, borderWidth: 2 }
                                 ]
                              ]} 
                           />
                           {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                        </View>
                        {isGlobal ? (
                           <GlobalEventCard
                              title={item.title}
                              subtitle={item.subtitle}
                              color={adminTagColor}
                              participants={taskParticipants}
                              isJoined={isUserJoined}
                           />
                        ) : (
                           <View style={[styles.agendaCard, { backgroundColor: colors.cardBackground }]}>
                              <Text style={[styles.agendaTitle, { color: colors.text }]}>{item.title}</Text>
                              {item.subtitle && <Text style={[styles.agendaSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>}
                           </View>
                        )}
                     </Pressable>
                  );
               })}
            </View>
         ))}
      </>
   );
}

const styles = StyleSheet.create({
   agendaBlock: {
      marginTop: 28,
   },
   agendaLabel: {
      fontSize: 13,
      marginBottom: 12,
      letterSpacing: 1,
   },
   agendaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
   },
   timeText: {
      width: 52,
      fontWeight: '600',
   },
   timeline: {
      alignItems: 'center',
      marginRight: 12,
      alignSelf: 'stretch',
   },
   bullet: {
      width: 12,
      height: 12,
      borderRadius: 6,
   },
   bulletGlobal: {
      width: 16,
      height: 16,
      borderRadius: 8,
   },
   timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      minHeight: 48,
   },
   agendaCard: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   agendaTitle: {
      fontWeight: '600',
      marginBottom: 4,
   },
   agendaSubtitle: {
      fontSize: 12,
   },
});
