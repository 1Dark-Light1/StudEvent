import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './components/auth/LoginScreen';
import Register from './components/auth/RegisterScreen';
import Main from './components/screens/Main/MainScreen';
import UserCalendar from './components/screens/UserCalendar/UserCalendarScreen';
import CompletedTasks from './components/screens/CompletedTasks/CompletedTasksScreen';
import Alerts from './components/screens/Alerts/AlertsScreen';
import Settings from './components/screens/Settings/SettingsScreen';
import AddTask from './components/screens/AddTask/AddTaskScreen';
import LanguageScreen from './components/screens/Settings/LanguageScreen';
import { I18nProvider } from './i18n/I18nContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <I18nProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Main" component={Main} />
          <Stack.Screen name="UserCalendar" component={UserCalendar} />
          <Stack.Screen name="CompletedTasks" component={CompletedTasks} />
          <Stack.Screen name="Alerts" component={Alerts} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="AddTask" component={AddTask} />
        </Stack.Navigator>
      </NavigationContainer>
    </I18nProvider>
  );
}