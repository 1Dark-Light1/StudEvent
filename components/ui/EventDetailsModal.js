/**
 * EventDetailsModal - modal window for displaying full event details
 */
import React, { useState, useEffect } from 'react';
import {
   Modal,
   View,
   Text,
   Pressable,
   ScrollView,
   Alert,
   ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { joinEvent, leaveEvent, isUserJoined, getParticipantsCount, isAdmin, markTaskAsCompleted, markTaskAsUncompleted, canMarkTaskAsCompleted, canJoinEvent, parseDate, parseTime } from '../../services/tasksService';
import { getUserDataById } from '../../services/userService';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../FireBaseConfig';
import { styles, darkStyles } from './EventDetailsModal.styles';



export default function EventDetailsModal({ visible, event, onClose, onDelete }) {
   const { t, tagLabel, errorText, displayDate, displayTime } = useI18n();
   const { colors, isDark } = useTheme();
   // Light styles plus their dark-theme override, if any
   const st = (name) => (isDark && darkStyles[name] ? [styles[name], darkStyles[name]] : styles[name]);
   const [isJoined, setIsJoined] = useState(false);
   const [participantsCount, setParticipantsCount] = useState(0);
   const [isLoading, setIsLoading] = useState(false);
   const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
   const [participantsList, setParticipantsList] = useState([]);
   const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
   const [isMarkingTask, setIsMarkingTask] = useState(false);
   const [taskCompletionStatus, setTaskCompletionStatus] = useState(null); // 'completed', 'uncompleted', null
   const [canJoin, setCanJoin] = useState(true); // whether the global event can still be joined
   const userIsAdmin = isAdmin();

   useEffect(() => {
      if (visible && event) {
         loadEventStatus();
         loadTaskCompletionStatus();
         setIsParticipantsExpanded(false);
         setParticipantsList([]);
         
         // Can the global event still be joined?
         if (event.isGlobal && !isJoined) {
            const taskData = {
               date: event.date,
               time: event.time,
               timeDilation: event.timeDilation,
               fromTime: event.fromTime,
               toTime: event.toTime,
            };
            const canJoinResult = canJoinEvent(taskData);
            setCanJoin(canJoinResult.canJoin);
         } else {
            setCanJoin(true);
         }
      }
      // The loaders are recreated every render; reload only when the event or visibility changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [visible, event, isJoined]);
   
   const loadTaskCompletionStatus = async () => {
      if (!event?.id) return;
      
      try {
         const taskRef = doc(db, 'tasks', event.id);
         const taskSnap = await getDoc(taskRef);
         
         if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            const user = auth.currentUser;
            
            if (taskData.isGlobal && taskData.userCompletions && user) {
               // Global tasks: use the current user's status
               const userCompletion = taskData.userCompletions[user.uid];
               if (userCompletion) {
                  if (userCompletion.isCompleted === true) {
                     setTaskCompletionStatus('completed');
                  } else if (userCompletion.isUncompleted === true) {
                     setTaskCompletionStatus('uncompleted');
                  } else {
                     setTaskCompletionStatus(null);
                  }
               } else {
                  setTaskCompletionStatus(null);
               }
            } else {
               // Own tasks: use the task status
               if (taskData.isCompleted === true) {
                  setTaskCompletionStatus('completed');
               } else if (taskData.isUncompleted === true) {
                  setTaskCompletionStatus('uncompleted');
               } else {
                  setTaskCompletionStatus(null);
               }
            }
         }
      } catch (error) {
         console.error('Error loading task completion status:', error);
      }
   };

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
               // Load all participants, not only the first 4
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
         // Expanding: load the list
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
               Alert.alert(t('event.success'), t(result.messageKey));
            }
         } else {
            const result = await joinEvent(event.id);
            if (result.success) {
               setIsJoined(true);
               setParticipantsCount(prev => prev + 1);
               Alert.alert(t('event.success'), t(result.messageKey));
            } else {
               Alert.alert(t('event.info'), t(result.messageKey));
            }
         }
      } catch {
         Alert.alert(t('event.error'), t('event.errorMessage'));
      } finally {
         setIsLoading(false);
      }
   };
   
   const handleMarkTaskCompletion = async () => {
      if (!event?.id) return;
      
      setIsMarkingTask(true);
      try {
         // Load the full task to check it
         const taskRef = doc(db, 'tasks', event.id);
         const taskSnap = await getDoc(taskRef);
         
         if (!taskSnap.exists()) {
            Alert.alert(t('event.error'), t('event.errorMessage'));
            return;
         }
         
         const taskData = { id: taskSnap.id, ...taskSnap.data() };
         
         // Current status
         const user = auth.currentUser;
         let currentStatus = null;
         if (taskData.isGlobal && taskData.userCompletions && user) {
            const userCompletion = taskData.userCompletions[user.uid];
            if (userCompletion) {
               if (userCompletion.isCompleted === true) {
                  currentStatus = 'completed';
               } else if (userCompletion.isUncompleted === true) {
                  currentStatus = 'uncompleted';
               }
            }
         } else {
            if (taskData.isCompleted === true) {
               currentStatus = 'completed';
            } else if (taskData.isUncompleted === true) {
               currentStatus = 'uncompleted';
            }
         }
         
         // Toggle the status
         if (currentStatus === 'completed') {
            // Completed -> uncompleted (always allowed)
            await markTaskAsUncompleted(event.id);
            setTaskCompletionStatus('uncompleted');
            Alert.alert(t('event.success'), t('completed.markedUncompleted'));
         } else if (currentStatus === 'uncompleted') {
            // Uncompleted -> completed, only within the time window
            const canMark = canMarkTaskAsCompleted(taskData);
            if (!canMark.canMark) {
               if (canMark.reason === 'too_early') {
                  Alert.alert(t('event.info'), t('completed.canMarkAfterStart'));
               } else if (canMark.reason === 'expired') {
                  Alert.alert(t('event.info'), t('completed.timeWindowExpired'));
               } else {
                  Alert.alert(t('event.info'), t('event.errorMessage'));
               }
               return;
            }
            
            await markTaskAsCompleted(event.id);
            setTaskCompletionStatus('completed');
            Alert.alert(t('event.success'), t('completed.markedCompleted'));
         } else {
            // Not marked yet: check whether it can be marked as completed
            const canMark = canMarkTaskAsCompleted(taskData);
            if (!canMark.canMark) {
               if (canMark.reason === 'too_early') {
                  Alert.alert(t('event.info'), t('completed.canMarkAfterStart'));
               } else if (canMark.reason === 'expired') {
                  Alert.alert(t('event.info'), t('completed.timeWindowExpired'));
               } else {
                  Alert.alert(t('event.info'), t('event.errorMessage'));
               }
               return;
            }
            
            await markTaskAsCompleted(event.id);
            setTaskCompletionStatus('completed');
            Alert.alert(t('event.success'), t('completed.markedCompleted'));
         }
         
         // Reload the status
         await loadTaskCompletionStatus();
      } catch (error) {
         console.error('Error marking task:', error);
         Alert.alert(t('event.error'), errorText(error, 'event.errorMessage'));
      } finally {
         setIsMarkingTask(false);
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
            <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
               {/* Header */}
               <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.headerTop}>
                     <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.iconBg }]}>
                        <Ionicons name="close" size={28} color={colors.text} />
                     </Pressable>
                     <Text style={[styles.headerLabel, { color: colors.text }]}>{t('event.details')}</Text>
                     {(userIsAdmin || !event.isGlobal) && (
                        <Pressable onPress={handleDelete} style={[styles.deleteButton, { backgroundColor: colors.iconBg }]}>
                           <Ionicons name="trash-outline" size={24} color={colors.error} />
                        </Pressable>
                     )}
                     {!userIsAdmin && event.isGlobal && <View style={styles.deleteButtonPlaceholder} />}
                  </View>

                  <View style={styles.headerContent}>
                     <View style={[styles.iconCircle, { backgroundColor: event.color || colors.primary }]}>
                        <Ionicons name="calendar" size={32} color="#fff" />
                     </View>
                     <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
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
                           <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                           <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('event.description')}</Text>
                        </View>
                        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{event.subtitle}</Text>
                     </View>
                  )}

                  {/* Date & Time */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="time-outline" size={22} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('event.dateTime')}</Text>
                     </View>
                     <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                           <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                           <Text style={[styles.infoText, { color: colors.textSecondary }]}>{displayDate(event.date)}</Text>
                        </View>
                        {event.time && (
                           <View style={styles.infoItem}>
                              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{displayTime(event.time)}</Text>
                           </View>
                        )}
                     </View>
                  </View>

                  {/* Tag */}
                  {event.tagText && (
                     <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                           <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
                           <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('event.category')}</Text>
                        </View>
                        <View style={styles.tagContainer}>
                           <View style={[styles.tag, { backgroundColor: event.color || '#2f7cff' }]}>
                              <Text style={styles.tagText}>{tagLabel(event.tagText)}</Text>
                           </View>
                        </View>
                     </View>
                  )}

                  {/* Status */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('event.status')}</Text>
                     </View>
                     <View style={styles.statusContainer}>
                        <View style={[
                           styles.statusBadge,
                           event.tone === 'highlight' ? st('statusActive') : st('statusInactive')
                        ]}>
                           <View style={[
                              styles.statusDot,
                              event.tone === 'highlight' ? styles.statusDotActive : styles.statusDotInactive
                           ]} />
                           <Text style={[
                              styles.statusText,
                              event.tone === 'highlight' ? st('statusTextActive') : st('statusTextInactive')
                           ]}>
                              {event.tone === 'highlight' ? t('event.activeNow') : t('event.scheduled')}
                           </Text>
                        </View>
                        {taskCompletionStatus && (
                           <View style={[
                              styles.statusBadge,
                              taskCompletionStatus === 'completed' ? st('statusCompleted') : st('statusUncompleted'),
                              { marginTop: 8 }
                           ]}>
                              <View style={[
                                 styles.statusDot,
                                 taskCompletionStatus === 'completed' ? styles.statusDotCompleted : styles.statusDotUncompleted
                              ]} />
                              <Text style={[
                                 styles.statusText,
                                 taskCompletionStatus === 'completed' ? st('statusTextCompleted') : st('statusTextUncompleted')
                              ]}>
                                 {taskCompletionStatus === 'completed' 
                                    ? t('completed.completed') 
                                    : t('completed.uncompleted')}
                              </Text>
                           </View>
                        )}
                     </View>
                  </View>
                  
                  {/* Task completion actions - only for own (non-global) tasks */}
                  {!event.isGlobal && (() => {
                     // Should the button be shown, and is it enabled?
                     let canShowButton = false;
                     let isButtonDisabled = false;
                     
                     try {
                        // Check with the event data
                        const taskData = {
                           date: event.date,
                           time: event.time,
                           timeDilation: event.timeDilation,
                           fromTime: event.fromTime,
                           toTime: event.toTime,
                        };
                        const canMark = canMarkTaskAsCompleted(taskData);
                        
                        // Has the time window passed (30 min after the end)?
                        const now = new Date();
                        let timePassed = false;
                        
                        if (taskData.timeDilation && taskData.fromTime && taskData.toTime) {
                           const taskDate = parseDate(taskData.date);
                           const toTime = parseTime(taskData.toTime, taskDate);
                           const deadline = new Date(toTime);
                           deadline.setMinutes(deadline.getMinutes() + 30);
                           timePassed = now > deadline;
                        } else if (taskData.time) {
                           const taskDate = parseDate(taskData.date);
                           const taskTime = parseTime(taskData.time, taskDate);
                           const deadline = new Date(taskTime);
                           deadline.setMinutes(deadline.getMinutes() + 30);
                           timePassed = now > deadline;
                        }
                        
                        if (taskCompletionStatus === 'completed') {
                           // Completed: can switch to uncompleted only within the time window
                           canShowButton = true;
                           // Disabled once the time has passed
                           isButtonDisabled = !canMark.canMark || timePassed;
                        } else if (taskCompletionStatus === 'uncompleted') {
                           // Uncompleted: can switch back only within the time window
                           canShowButton = true;
                           isButtonDisabled = !canMark.canMark;
                        } else {
                           // Not marked: show the button if
                           // 1. the task is today or in the past
                           // 2. or it has no time (can be marked any time)
                           const taskDate = parseDate(taskData.date);
                           const today = new Date();
                           today.setHours(0, 0, 0, 0);
                           const taskDateOnly = new Date(taskDate);
                           taskDateOnly.setHours(0, 0, 0, 0);
                           
                           // No time: always show for tasks today or in the past
                           if (!taskData.time && !taskData.timeDilation) {
                              canShowButton = taskDateOnly <= today;
                              isButtonDisabled = false;
                           } else {
                              // With a time: show only if it can be marked
                              canShowButton = canMark.canMark;
                              isButtonDisabled = !canMark.canMark;
                           }
                        }
                     } catch {
                        // On error, hide the button
                        canShowButton = false;
                     }
                     
                     if (!canShowButton) return null;
                     
                     return (
                        <View style={styles.actionSection}>
                           <Pressable 
                              style={({ pressed }) => [
                                 styles.completionButton,
                                 { 
                                    backgroundColor: taskCompletionStatus === 'completed' ? '#f44336' : '#4caf50',
                                    opacity: isButtonDisabled ? 0.5 : 1
                                 },
                                 pressed && styles.completionButtonPressed,
                                 (isMarkingTask || isButtonDisabled) && styles.completionButtonDisabled
                              ]}
                              onPress={handleMarkTaskCompletion}
                              disabled={isMarkingTask || isButtonDisabled}
                           >
                              {isMarkingTask ? (
                                 <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                 <>
                                    <Ionicons 
                                       name={taskCompletionStatus === 'completed' ? "close-circle" : "checkmark-circle"} 
                                       size={22} 
                                       color="#fff" 
                                    />
                                    <Text style={styles.completionButtonText}>
                                       {taskCompletionStatus === 'completed' 
                                          ? t('completed.markUncompleted') 
                                          : t('completed.markCompleted')}
                                    </Text>
                                 </>
                              )}
                           </Pressable>
                        </View>
                     );
                  })()}

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
                              <Ionicons name="people-outline" size={22} color={colors.primary} />
                              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('event.participants')}</Text>
                           </View>
                           <Ionicons 
                              name={isParticipantsExpanded ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color="#9aa7bd" 
                           />
                        </Pressable>
                        <View style={styles.participantsContainer}>
                           <View style={st('participantsBadge')}>
                              <Ionicons name="people" size={18} color="#2f7cff" />
                              <Text style={st('participantsText')}>
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
                                       <View key={index} style={st('participantItem')}>
                                          <View style={st('participantAvatar')}>
                                             <Ionicons name="person" size={18} color="#2f7cff" />
                                          </View>
                                          <Text style={st('participantName')}>{fullName}</Text>
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

                  {/* Join event button - only for global tasks */}
                  {event.isGlobal && (
                     <View style={styles.actionSection}>
                        <Pressable 
                           style={({ pressed }) => [
                              styles.joinButton,
                              { 
                                 backgroundColor: isJoined ? '#4caf50' : (event.color || '#2f7cff'),
                                 opacity: (!canJoin) ? 0.5 : 1
                              },
                              pressed && styles.joinButtonPressed,
                              (isLoading || !canJoin) && styles.joinButtonDisabled
                           ]}
                           onPress={handleJoinEvent}
                           disabled={isLoading || !canJoin}
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
                  )}
               </ScrollView>
            </View>
         </View>
      </Modal>
   );
}
