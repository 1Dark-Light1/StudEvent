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
import { joinEvent, leaveEvent, isUserJoined, getParticipantsCount } from '../../services/tasksService';

/**
 * Форматирует время для отображения (добавляет AM/PM)
 */
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

/**
 * Форматирует дату для отображения
 */
function formatDateForDisplay(dateString) {
   const [day, month, year] = dateString.split('.');
   const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
   ];
   return `${monthNames[parseInt(month) - 1]} ${day}, ${year}`;
}

export default function EventDetailsModal({ visible, event, onClose, onDelete }) {
   const [isJoined, setIsJoined] = useState(false);
   const [participantsCount, setParticipantsCount] = useState(0);
   const [isLoading, setIsLoading] = useState(false);

   // Загружаем статус участия при открытии модала
   useEffect(() => {
      if (visible && event) {
         loadEventStatus();
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

   if (!event) return null;

   // Debug
   console.log('EventDetailsModal event:', event);

   const handleDelete = () => {
      Alert.alert(
         'Delete Event',
         'Are you sure you want to delete this event?',
         [
            {
               text: 'Cancel',
               style: 'cancel',
            },
            {
               text: 'Delete',
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
            // Выход из события
            const result = await leaveEvent(event.id);
            if (result.success) {
               setIsJoined(false);
               setParticipantsCount(prev => Math.max(0, prev - 1));
               Alert.alert('Sukces', result.message);
            }
         } else {
            // Присоединение к событию
            const result = await joinEvent(event.id);
            if (result.success) {
               setIsJoined(true);
               setParticipantsCount(prev => prev + 1);
               Alert.alert('Sukces', result.message);
            } else {
               Alert.alert('Informacja', result.message);
            }
         }
      } catch (error) {
         Alert.alert('Błąd', 'Nie udało się przetworzyć żądania. Spróbuj ponownie.');
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
                     <Text style={styles.headerLabel}>Event Details</Text>
                     <Pressable onPress={handleDelete} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={24} color="#f44336" />
                     </Pressable>
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
                           <Text style={styles.sectionTitle}>Description</Text>
                        </View>
                        <Text style={styles.descriptionText}>{event.subtitle}</Text>
                     </View>
                  )}

                  {/* Date & Time */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="time-outline" size={22} color="#2f7cff" />
                        <Text style={styles.sectionTitle}>Date & Time</Text>
                     </View>
                     <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                           <Ionicons name="calendar-outline" size={18} color="#9aa7bd" />
                           <Text style={styles.infoText}>{formatDateForDisplay(event.date)}</Text>
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
                           <Text style={styles.sectionTitle}>Category</Text>
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
                        <Text style={styles.sectionTitle}>Status</Text>
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
                              {event.tone === 'highlight' ? 'Active Now' : 'Scheduled'}
                           </Text>
                        </View>
                     </View>
                  </View>

                  {/* Participants */}
                  <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <Ionicons name="people-outline" size={22} color="#2f7cff" />
                        <Text style={styles.sectionTitle}>Uczestnicy</Text>
                     </View>
                     <View style={styles.participantsContainer}>
                        <View style={styles.participantsBadge}>
                           <Ionicons name="people" size={18} color="#2f7cff" />
                           <Text style={styles.participantsText}>
                              {participantsCount} {participantsCount === 1 ? 'uczestnik' : 'uczestników'}
                           </Text>
                        </View>
                     </View>
                  </View>

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
                                 {isJoined ? 'Opuść wydarzenie' : 'Dołącz do wydarzenia'}
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
   participantsContainer: {
      paddingLeft: 30,
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
