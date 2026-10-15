/** Round profile photo, or a person icon when there is none. */
import React, { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToUserData } from '../../services/userService';

/** The signed-in user's profile (name, surname, photo), kept up to date. */
export function useMyProfile() {
   const [profile, setProfile] = useState(null);
   useEffect(() => subscribeToUserData(setProfile), []);
   return profile;
}

export default function Avatar({ photo, size, backgroundColor, iconColor, style }) {
   return (
      <View
         style={[
            { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor },
            style,
         ]}
      >
         {photo ? (
            <Image source={{ uri: photo }} style={{ width: size, height: size }} />
         ) : (
            <Ionicons name="person" size={Math.round(size * 0.55)} color={iconColor} />
         )}
      </View>
   );
}
