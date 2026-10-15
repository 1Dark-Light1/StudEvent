/**
 * Card for a global (admin) event in the Home agenda and the personal calendar:
 * tag-colored gradient, up to 4 participant avatars and a joined/not-joined icon.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

export default function GlobalEventCard({ title, subtitle, color = '#2f7cff', participants = [], isJoined, large = false }) {
   const gradient = [color, `${color}E6`, `${color}CC`, `${color}99`];
   const inset = large ? 18 : 14;

   return (
      <LinearGradient
         colors={gradient}
         start={{ x: 0, y: 0 }}
         end={{ x: 0, y: 1 }}
         style={[styles.card, { borderRadius: large ? 20 : 14, padding: inset }]}
      >
         <Text style={styles.title}>{title}</Text>
         {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
         {participants.length > 0 && (
            <View style={styles.participantsRow}>
               {participants.slice(0, 4).map((participant, index) => (
                  <Avatar
                     key={index}
                     photo={participant?.photo}
                     size={28}
                     backgroundColor={color}
                     iconColor="#fff"
                     style={[styles.avatar, index > 0 && { marginLeft: -8 }]}
                  />
               ))}
            </View>
         )}
         <View style={[styles.joinIcon, { bottom: inset, right: inset }]}>
            {isJoined ? (
               <Ionicons name="checkmark-circle" size={24} color="#fff" />
            ) : (
               <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.7)" />
            )}
         </View>
      </LinearGradient>
   );
}

const styles = StyleSheet.create({
   card: {
      flex: 1,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      minHeight: 70,
   },
   title: {
      color: '#fff',
      fontWeight: '600',
      marginBottom: 6,
      fontSize: 15,
   },
   subtitle: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 12,
      marginBottom: 8,
   },
   participantsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
   },
   avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
   },
   joinIcon: {
      position: 'absolute',
   },
});
