/**
 * EventDetailsModal - модальное окно для отображения полных деталей события
 */
import React, { useState, useEffect } from 'react';
import {
   Modal,
   View,
   Text,
   StyleSheet,
   Pressable,
   ScrollView,
   Alert,
   ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { joinEvent, leaveEvent, isUserJoined, getParticipantsCount, isAdmin } from '../../services/tasksService';
import { getUsersDataByIds, getUserDataById } from '../../services/userService';
import { useI18n } from '../../i18n/I18nContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../FireBaseConfig';


function formatTimeForDisplay(timeString) {
   if (!timeString) return '';
   if (timeString.includes('-')) {
      const [from, to] = timeString.split('-');
      return `${formatSingleTime(from)} - ${formatSingleTime(to)}`;
   }
   return formatSingleTime(timeString);
}

function formatSingleTime(timeString) {
   const [hours, minutes] = timeString.split(':');
   const hour = parseInt(hours, 10);
   const ampm = hour >= 12 ? 'PM' : 'AM';
   const displayHour = hour % 12 || 12;
   return `${displayHour}:${minutes} ${ampm}`;
}


function formatDateForDisplay(dateString, t) {
   const [day, month, year] = dateString.split('.');
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
   ];
   return `${monthNames[parseInt(month) - 1]} ${day}, ${year}`;
}

export default function EventDetailsModal({ visible, event, onClose, onDelete }) {
   const { t } = useI18n();
   const [isJoined, setIsJoined] = useState(false);
   const [participantsCount, setParticipantsCount] = useState(0);
   const [isLoading, setIsLoading] = useState(false);
   const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
   const [participantsList, setParticipantsList] = useState([]);
   const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
   const userIsAdmin = isAdmin();

   useEffect(() => {
      if (visible && event) {
         loadEventStatus();
         setIsParticipantsExpanded(false);
         setParticipantsList([]);
      }
   }, [visible, event]);

   const loadEventStatus = async () => {
      if (!event?.id) return;
      
      try {
         const joined = await isUserJoined(event.id);
         const count = await getParticipantsCount(event.id);
         setIsJoined(joined);
         setParticipantsCount(count);
      } catch (error) {
         console.error('Error loading event status:', error);
      }
   };

   const loadParticipantsList = async () => {
      if (!event?.id || !event.isGlobal) return;
      
      setIsLoadingParticipants(true);
      try {
         const taskRef = doc(db, 'tasks', event.id);
         const taskSnap = await getDoc(taskRef);
         
         if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            const participantsIds = taskData.participants || [];
            
            if (participantsIds.length > 0) {
               // Завантажуємо всіх учасників, не тільки перших 4
               const usersDataPromises = participantsIds.map(userId => 
                  getUserDataById(userId)
               );
               const usersData = await Promise.all(usersDataPromises);
               setParticipantsList(usersData.filter(user => user !== null));
            } else {
               setParticipantsList([]);
            }
         }
      } catch (error) {
         console.error('Error loading participants list:', error);
         setParticipantsList([]);
      } finally {
         setIsLoadingParticipants(false);
      }
   };

   const handleParticipantsToggle = async () => {
      if (!isParticipantsExpanded) {
         // Розгортаємо - завантажуємо список
         await loadParticipantsList();
      }
      setIsParticipantsExpanded(!isParticipantsExpanded);
   };

   if (!event) return null;

   // Debug
   console.log('EventDetailsModal event:', event);

   const handleDelete = () => {
      Alert.alert(
         t('event.delete'),
         t('event.deleteConfirm'),
         [
            {
               text: t('task.cancel'),
               style: 'cancel',
            },
            {
               text: t('event.deleteAction'),
               style: 'destructive',
               onPress: () => {
                  onDelete(event.id);
                  onClose();
               },
            },
         ]
      );
   };

   const handleJoinEvent = async () => {
      setIsLoading(true);
      try {
         if (isJoined) {
            const result = await leaveEvent(event.id);
            if (result.success) {
               setIsJoined(false);
               setParticipantsCount(prev => Math.max(0, prev - 1));
               Alert.alert(t('event.success'), result.message);
            }
         } else {
            const result = await joinEvent(event.id);
            if (result.success) {
               setIsJoined(true);
               setParticipantsCount(prev => prev + 1);
               Alert.alert(t('event.success'), result.message);
            } else {
               Alert.alert(t('event.info'), result.message);
            }
         }
      } catch (error) {
         Alert.alert(t('event.error'), t('event.errorMessage'));
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <Modal
         visible={visible}
         animationType="slide"
         transparent={true}
         onRequestClose={onClose}
      >
         <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
               {/* Header */}
               <View style={styles.header}>
                  <View style={styles.headerTop}>
                     <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#262c3b" />
                     </Pressable>
                     <Text style={styles.headerLabel}>{t('event.details')}</Text>
                     {(userIsAdmin || !event.isGlobal) && (
                        <Pressable onPress={handleDelete} style={styles.deleteButton}>
                           <Ionicons name="trash-outline" size={24} color="#f44336" />
                        </Pressable>
                     )}
                     {!userIsAdmin && event.isGlobal && <View style={styles.deleteButtonPlaceholder} />}
                  </View>

                  <View style={styles.headerContent}>
                     <View style={[styles.iconCircle, { backgroundColor: event.color || '#2f7cff' }]}>
                        <Ionicons name="calendar" size={32} color="#fff" />
                     </View>
                     <Text style={styles.eventTitle}>{event.title}</Text>
                  </View>
               </View>

               {/* Content */}
               <ScrollView 
                  style={styles.content}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.contentContainer}
               >
                  {/* Description */}
                  {event.subtitle && (
                     <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                           <Ionicons name="document-text-outline" size={22} color="#2f7cff" />
                           <Text style={styles.sectionTitle}>{t('event.description')}</Text>
                        </View>
                        <Text style={styles.descriptionText}>{event.subtitle}</Text>
                     </View>
                  )}

                  {/* Date & Time */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="time-outline" size={22} color="#2f7cff" />
                        <Text style={styles.sectionTitle}>{t('event.dateTime')}</Text>
                     </View>
                     <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                           <Ionicons name="calendar-outline" size={18} color="#9aa7bd" />
                           <Text style={styles.infoText}>{formatDateForDisplay(event.date, t)}</Text>
                        </View>
                        {event.time && (
                           <View style={styles.infoItem}>
                              <Ionicons name="time-outline" size={18} color="#9aa7bd" />
                              <Text style={styles.infoText}>{formatTimeForDisplay(event.time)}</Text>
                           </View>
                        )}
                     </View>
                  </View>

                  {/* Tag */}
                  {event.tagText && (
                     <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                           <Ionicons name="pricetag-outline" size={22} color="#2f7cff" />
                           <Text style={styles.sectionTitle}>{t('event.category')}</Text>
                        </View>
                        <View style={styles.tagContainer}>
                           <View style={[styles.tag, { backgroundColor: event.color || '#2f7cff' }]}>
                              <Text style={styles.tagText}>{event.tagText}</Text>
                           </View>
                        </View>
                     </View>
                  )}

                  {/* Status */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={22} color="#2f7cff" />
                        <Text style={styles.sectionTitle}>{t('event.status')}</Text>
                     </View>
                     <View style={styles.statusContainer}>
                        <View style={[
                           styles.statusBadge,
                           event.tone === 'highlight' ? styles.statusActive : styles.statusInactive
                        ]}>
                           <View style={[
                              styles.statusDot,
                              event.tone === 'highlight' ? styles.statusDotActive : styles.statusDotInactive
                           ]} />
                           <Text style={[
                              styles.statusText,
                              event.tone === 'highlight' ? styles.statusTextActive : styles.statusTextInactive
                           ]}>
                              {event.tone === 'highlight' ? t('event.activeNow') : t('event.scheduled')}
                           </Text>
                        </View>
                     </View>
                  </View>

                  {/* Participants */}
                  {event.isGlobal && (
                     <View style={styles.section}>
                        <Pressable 
                           onPress={handleParticipantsToggle} 
                           style={({ pressed }) => [
                              styles.participantsSectionHeader,
                              pressed && { opacity: 0.7 }
                           ]}
                        >
                           <View style={styles.sectionHeader}>
                              <Ionicons name="people-outline" size={22} color="#2f7cff" />
                              <Text style={styles.sectionTitle}>{t('event.participants')}</Text>
                           </View>
                           <Ionicons 
                              name={isParticipantsExpanded ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color="#9aa7bd" 
                           />
                        </Pressable>
                        <View style={styles.participantsContainer}>
                           <View style={styles.participantsBadge}>
                              <Ionicons name="people" size={18} color="#2f7cff" />
                              <Text style={styles.participantsText}>
                                 {participantsCount} {participantsCount === 1 ? t('event.participant') : t('event.participantsPlural')}
                              </Text>
                           </View>
                        </View>
                        {isParticipantsExpanded && (
                           <View style={styles.participantsListContainer}>
                              {isLoadingParticipants ? (
                                 <View style={styles.participantsListLoading}>
                                    <ActivityIndicator size="small" color="#2f7cff" />
                                    <Text style={styles.participantsListLoadingText}>{t('event.loadingParticipants')}</Text>
                                 </View>
                              ) : participantsList.length > 0 ? (
                                 participantsList.map((participant, index) => {
                                    const fullName = `${participant.name || ''} ${participant.surname || ''}`.trim() || t('settings.profile.fallbackName');
                                    return (
                                       <View key={index} style={styles.participantItem}>
                                          <View style={styles.participantAvatar}>
                                             <Ionicons name="person" size={18} color="#2f7cff" />
                                          </View>
                                          <Text style={styles.participantName}>{fullName}</Text>
                                       </View>
                                    );
                                 })
                              ) : (
                                 <View style={styles.participantsListEmpty}>
                                    <Text style={styles.participantsListEmptyText}>{t('event.noParticipants')}</Text>
                                 </View>
                              )}
                           </View>
                        )}
                     </View>
                  )}

                  {/* Join Event Button */}
                  <View style={styles.actionSection}>
                     <Pressable 
                        style={({ pressed }) => [
                           styles.joinButton,
                           { backgroundColor: isJoined ? '#4caf50' : (event.color || '#2f7cff') },
                           pressed && styles.joinButtonPressed,
                           isLoading && styles.joinButtonDisabled
                        ]}
                        onPress={handleJoinEvent}
                        disabled={isLoading}
                     >
                        {isLoading ? (
                           <ActivityIndicator size="small" color="#fff" />
                        ) : (
                           <>
                              <Ionicons 
                                 name={isJoined ? "checkmark-circle" : "people"} 
                                 size={22} 
                                 color="#fff" 
                              />
                              <Text style={styles.joinButtonText}>
                                 {isJoined ? t('event.leave') : t('event.join')}
                              </Text>
                              <Ionicons 
                                 name={isJoined ? "exit-outline" : "arrow-forward"} 
                                 size={20} 
                                 color="#fff" 
                              />
                           </>
                        )}
                     </Pressable>
                  </View>
               </ScrollView>
            </View>
         </View>
      </Modal>
   );
}

const styles = StyleSheet.create({
   modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
   },
   modalContainer: {
      backgroundColor: '#fff',
      borderRadius: 30,
      maxHeight: '80%',
      minHeight: '60%',
      width: '100%',
      maxWidth: 500,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
      overflow: 'hidden',
   },
   header: {
      paddingTop: 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
      backgroundColor: '#fff',
   },
   headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
   },
   closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f4f5fb',
      alignItems: 'center',
      justifyContent: 'center',
   },
   headerLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#262c3b',
   },
   deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#ffebee',
      alignItems: 'center',
      justifyContent: 'center',
   },
   deleteButtonPlaceholder: {
      width: 40,
      height: 40,
   },
   headerContent: {
      alignItems: 'center',
   },
   iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
   },
   eventTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: '#262c3b',
      textAlign: 'center',
      paddingHorizontal: 20,
   },
   content: {
      flex: 1,
   },
   contentContainer: {
      padding: 20,
      paddingBottom: 40,
      flexGrow: 1,
   },
   section: {
      marginBottom: 24,
   },
   sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
   },
   sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#262c3b',
      marginLeft: 8,
   },
   descriptionText: {
      fontSize: 15,
      lineHeight: 24,
      color: '#5a6477',
      paddingLeft: 30,
   },
   infoRow: {
      paddingLeft: 30,
   },
   infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
   },
   infoText: {
      fontSize: 15,
      color: '#5a6477',
      marginLeft: 10,
   },
   tagContainer: {
      paddingLeft: 30,
      flexDirection: 'row',
      flexWrap: 'wrap',
   },
   tag: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
   },
   tagText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
   },
   statusContainer: {
      paddingLeft: 30,
   },
   statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
   },
   statusActive: {
      backgroundColor: '#e8f5e9',
   },
   statusInactive: {
      backgroundColor: '#f5f7fa',
   },
   statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
   },
   statusDotActive: {
      backgroundColor: '#4caf50',
   },
   statusDotInactive: {
      backgroundColor: '#9aa7bd',
   },
   statusText: {
      fontSize: 14,
      fontWeight: '600',
   },
   statusTextActive: {
      color: '#2e7d32',
   },
   statusTextInactive: {
      color: '#5a6477',
   },
   participantsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
   },
   participantsContainer: {
      paddingLeft: 30,
      marginBottom: 12,
   },
   participantsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#e3f2fd',
      alignSelf: 'flex-start',
   },
   participantsText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1976d2',
      marginLeft: 8,
   },
   participantsListContainer: {
      paddingLeft: 30,
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#eef1f6',
   },
   participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      backgroundColor: '#f8f9fb',
      borderRadius: 10,
   },
   participantAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#e3f2fd',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
   },
   participantName: {
      fontSize: 15,
      fontWeight: '500',
      color: '#3a4257',
      flex: 1,
   },
   participantsListLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      gap: 10,
   },
   participantsListLoadingText: {
      fontSize: 14,
      color: '#9aa7bd',
   },
   participantsListEmpty: {
      paddingVertical: 20,
      alignItems: 'center',
   },
   participantsListEmptyText: {
      fontSize: 14,
      color: '#9aa7bd',
      fontStyle: 'italic',
   },
   actionSection: {
      marginTop: 8,
      marginBottom: 10,
   },
   joinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
   },
   joinButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
   },
   joinButtonDisabled: {
      opacity: 0.6,
   },
   joinButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      flex: 1,
      textAlign: 'center',
   },
});
