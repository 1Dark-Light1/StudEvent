/**
 * Declarative list of items shown in the global bottom navigation.
 * Keeping this array in one file helps designers copy-check labels,
 * allows analytics to iterate on ordering, and simplifies testing.
 */
export const bottomNavItems = [
   { key: 'home', label: 'Home', icon: 'home', route: 'Main' },
   { key: 'calendar', label: 'Calendar', icon: 'time', route: 'UserCalendar' },
   { key: 'alerts', label: 'Alerts', icon: 'notifications', route: 'Alerts' },
   { key: 'settings', label: 'Settings', icon: 'settings', route: 'Settings' },
];
