export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
  { code: 'pl', label: 'Polski' },
];

// Keep keys stable; values can evolve over time.
export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.calendar': 'Calendar',
    'nav.alerts': 'Alerts',
    'nav.settings': 'Settings',

    // Settings
    'settings.title': 'Your profile',
    'settings.personalInfo': 'Personal information',
    'settings.settings': 'Settings',
    'settings.notifications': 'Notifications',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.accounts': 'Accounts',
    'settings.logout.title': 'Log out',
    'settings.logout.confirm': 'Are you sure you want to log out?',
    'settings.logout.cancel': 'Cancel',
    'settings.logout.action': 'Log out',
    'settings.logout.errorTitle': 'Error',
    'settings.logout.errorBody': 'Failed to log out. Please try again.',
    'settings.profile.fallbackName': 'Name and Surname',

    // Language screen
    'language.title': 'Language',
    'language.subtitle': 'Choose the app language',

    // Auth
    'auth.login.title': 'Log in to your account',
    'auth.login.cta': 'Log in',
    'auth.login.remember': 'Remember your account',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signup': 'Sign up',
    'auth.login.alert.title': 'Login',
    'auth.login.alert.missing': 'Enter your email and password.',
    'auth.login.alert.successTitle': 'Success',
    'auth.login.alert.successBody': 'Login successful!',
    'auth.login.alert.errorTitle': 'Login error',
    'auth.login.alert.errorFallback': 'Incorrect email or password.',

    'auth.register.title': 'Create a new account',
    'auth.register.cta': 'Sign up',
    'auth.register.haveAccount': 'Do you already have an account?',
    'auth.register.login': 'Log in',
    'auth.register.acceptTerms': 'I accept the terms and conditions',
    'auth.register.alert.title': 'Registration',
    'auth.register.alert.mustAccept': 'You must accept the terms of use.',
    'auth.register.alert.missing': 'Enter your email and password.',
    'auth.register.alert.passwordMismatch': 'Passwords do not match.',
    'auth.register.alert.successTitle': 'Success',
    'auth.register.alert.successBody':
      'You have successfully registered! Now log in to your account',
    'auth.register.alert.errorTitle': 'Registration error',
    'auth.register.alert.errorFallback': 'Something went wrong.',

    // Common placeholders
    'field.email': 'Email',
    'field.password': 'Password',
    'field.firstName': 'First name',
    'field.lastName': 'Last name',
    'field.confirmPassword': 'Confirm password',
    'field.searchEvents': 'Search events by name...',
  },

  uk: {
    // Navigation
    'nav.home': 'Головна',
    'nav.calendar': 'Календар',
    'nav.alerts': 'Сповіщення',
    'nav.settings': 'Налаштування',

    // Settings
    'settings.title': 'Ваш профіль',
    'settings.personalInfo': 'Особиста інформація',
    'settings.settings': 'Налаштування',
    'settings.notifications': 'Сповіщення',
    'settings.language': 'Мова',
    'settings.theme': 'Тема',
    'settings.accounts': 'Акаунти',
    'settings.logout.title': 'Вийти',
    'settings.logout.confirm': 'Ви впевнені, що хочете вийти?',
    'settings.logout.cancel': 'Скасувати',
    'settings.logout.action': 'Вийти',
    'settings.logout.errorTitle': 'Помилка',
    'settings.logout.errorBody': 'Не вдалося вийти. Спробуйте ще раз.',
    'settings.profile.fallbackName': "Ім'я та Прізвище",

    // Language screen
    'language.title': 'Мова',
    'language.subtitle': 'Оберіть мову застосунку',

    // Auth
    'auth.login.title': 'Увійдіть до акаунту',
    'auth.login.cta': 'Увійти',
    'auth.login.remember': 'Запам’ятати акаунт',
    'auth.login.noAccount': 'Немає акаунту?',
    'auth.login.signup': 'Зареєструватися',
    'auth.login.alert.title': 'Вхід',
    'auth.login.alert.missing': 'Введіть email та пароль.',
    'auth.login.alert.successTitle': 'Успіх',
    'auth.login.alert.successBody': 'Вхід успішний!',
    'auth.login.alert.errorTitle': 'Помилка входу',
    'auth.login.alert.errorFallback': 'Невірний email або пароль.',

    'auth.register.title': 'Створити акаунт',
    'auth.register.cta': 'Зареєструватися',
    'auth.register.haveAccount': 'Вже маєте акаунт?',
    'auth.register.login': 'Увійти',
    'auth.register.acceptTerms': 'Я приймаю умови та правила',
    'auth.register.alert.title': 'Реєстрація',
    'auth.register.alert.mustAccept': 'Потрібно прийняти умови користування.',
    'auth.register.alert.missing': 'Введіть email та пароль.',
    'auth.register.alert.passwordMismatch': 'Паролі не збігаються.',
    'auth.register.alert.successTitle': 'Успіх',
    'auth.register.alert.successBody':
      'Реєстрація успішна! Тепер увійдіть до акаунту',
    'auth.register.alert.errorTitle': 'Помилка реєстрації',
    'auth.register.alert.errorFallback': 'Щось пішло не так.',

    // Common placeholders
    'field.email': 'Email',
    'field.password': 'Пароль',
    'field.firstName': "Ім'я",
    'field.lastName': 'Прізвище',
    'field.confirmPassword': 'Підтвердіть пароль',
    'field.searchEvents': 'Пошук подій за назвою...',
  },

  pl: {
    // Navigation
    'nav.home': 'Strona główna',
    'nav.calendar': 'Kalendarz',
    'nav.alerts': 'Powiadomienia',
    'nav.settings': 'Ustawienia',

    // Settings
    'settings.title': 'Twój profil',
    'settings.personalInfo': 'Dane osobowe',
    'settings.settings': 'Ustawienia',
    'settings.notifications': 'Powiadomienia',
    'settings.language': 'Język',
    'settings.theme': 'Motyw',
    'settings.accounts': 'Konta',
    'settings.logout.title': 'Wyloguj się',
    'settings.logout.confirm': 'Na pewno chcesz się wylogować?',
    'settings.logout.cancel': 'Anuluj',
    'settings.logout.action': 'Wyloguj',
    'settings.logout.errorTitle': 'Błąd',
    'settings.logout.errorBody': 'Nie udało się wylogować. Spróbuj ponownie.',
    'settings.profile.fallbackName': 'Imię i nazwisko',

    // Language screen
    'language.title': 'Język',
    'language.subtitle': 'Wybierz język aplikacji',

    // Auth
    'auth.login.title': 'Zaloguj się do konta',
    'auth.login.cta': 'Zaloguj się',
    'auth.login.remember': 'Zapamiętaj konto',
    'auth.login.noAccount': 'Nie masz konta?',
    'auth.login.signup': 'Zarejestruj się',
    'auth.login.alert.title': 'Logowanie',
    'auth.login.alert.missing': 'Wpisz email i hasło.',
    'auth.login.alert.successTitle': 'Sukces',
    'auth.login.alert.successBody': 'Zalogowano pomyślnie!',
    'auth.login.alert.errorTitle': 'Błąd logowania',
    'auth.login.alert.errorFallback': 'Nieprawidłowy email lub hasło.',

    'auth.register.title': 'Utwórz konto',
    'auth.register.cta': 'Zarejestruj się',
    'auth.register.haveAccount': 'Masz już konto?',
    'auth.register.login': 'Zaloguj się',
    'auth.register.acceptTerms': 'Akceptuję regulamin i warunki',
    'auth.register.alert.title': 'Rejestracja',
    'auth.register.alert.mustAccept': 'Musisz zaakceptować warunki.',
    'auth.register.alert.missing': 'Wpisz email i hasło.',
    'auth.register.alert.passwordMismatch': 'Hasła nie są takie same.',
    'auth.register.alert.successTitle': 'Sukces',
    'auth.register.alert.successBody':
      'Rejestracja zakończona! Teraz zaloguj się do konta',
    'auth.register.alert.errorTitle': 'Błąd rejestracji',
    'auth.register.alert.errorFallback': 'Coś poszło nie tak.',

    // Common placeholders
    'field.email': 'Email',
    'field.password': 'Hasło',
    'field.firstName': 'Imię',
    'field.lastName': 'Nazwisko',
    'field.confirmPassword': 'Potwierdź hasło',
    'field.searchEvents': 'Szukaj wydarzeń po nazwie...',
  },
};


