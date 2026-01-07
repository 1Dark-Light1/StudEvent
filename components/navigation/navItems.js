/**
 * Declarative list of items shown in the global bottom navigation.
 * Keeping this array in one file helps designers copy-check labels,
 * allows analytics to iterate on ordering, and simplifies testing.
 */
export const bottomNavItems = [
   { key: 'home', labelKey: 'nav.home', icon: 'home', route: 'Main' },
   { key: 'calendar', labelKey: 'nav.calendar', icon: 'time', route: 'UserCalendar' },
   { key: 'alerts', labelKey: 'nav.alerts', icon: 'notifications', route: 'Alerts' },
   { key: 'settings', labelKey: 'nav.settings', icon: 'settings', route: 'Settings' },
];
