<p align="center">
  <img src="assets/Load.png" width="120" alt="StudEvent logo" />
</p>

<h1 align="center">StudEvent</h1>

<p align="center">
  A mobile planner for students: personal tasks, shared university events and reminders, in one calendar.
</p>

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo" />
  <img alt="React Native 0.86" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase" />
  <img alt="Platforms" src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey" />
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.0-3b85ff" />
</p>

---

## Features

**Tasks**
- Create tasks with a time or a time range, a tag, a color and a description
- Repeat them once, weekly (until the end of the month) or on custom dates
- Mark tasks as completed within their time window (until 30 minutes after the end); missed tasks become *uncompleted* automatically
- Completed / uncompleted history

**Calendars**
- **Home** – month grid with an agenda of the month's tasks
- **Personal calendar** – week strip (swipe it to change the week) with a timeline of the selected day
- Search by name and filter by tag on both

**Global events**
- Admins publish events for everyone; users join or leave them and see who takes part (with profile photos)
- Users who have not joined get a *New event* notification

**Notifications** (local, scheduled on the device)

| Task | When | Example |
|---|---|---|
| Own task with a time | 30 min before the start | “Gym” starts in 30 minutes |
| | at the end | Did you complete “Gym”? |
| Own task without a time | 09:00 and 20:00 that day | Today: “Read” / Did you complete “Read”? |
| Joined global event | 18:00 the day before, 1 hour before | Tomorrow: “Party” / “Party” starts in 1 hour |
| New global event | when the app sees it | New event: “Party” |

The history of received notifications is shown on the **Notifications** screen.

**Profile & settings**
- Profile photo, first and last name
- Change email (with a confirmation link) and password, delete the account
- Light and dark theme, three languages (English, Українська, Polski), notification settings
- Stay signed in (*Remember your account*)

## Tech stack

- [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19
- Firebase Authentication (email & password) and Cloud Firestore
- `expo-notifications` for local reminders, `expo-image-picker` / `expo-image-manipulator` for profile photos
- React Navigation (native stack)
- ESLint (`eslint-config-expo`), Node's built-in test runner, Firebase Emulator for security rules tests

## Getting started

### Requirements

- Node.js 20 or newer
- The **Expo Go** app on a phone (Android or iOS), or an Android emulator
- Java 11+ only for the security rules tests

### Run the app

```bash
git clone https://github.com/1Dark-Light1/StudEvent.git
cd StudEvent
npm install
npx expo start
```

Scan the QR code with the camera (iOS) or the Expo Go app (Android). Press `a` to open an Android emulator, `w` for the web version.

If the phone cannot reach your computer (different networks, firewall), use `npx expo start --tunnel`.

### Use your own Firebase project

The app is connected to the project in [`FireBaseConfig.js`](FireBaseConfig.js). To run it against your own one:

1. Create a project in the [Firebase console](https://console.firebase.google.com) and add a **Web app**; copy its config into `FireBaseConfig.js`.
2. **Authentication** → enable the **Email/Password** provider.
3. **Firestore Database** → create a database.
4. Deploy the security rules:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   ```
5. **Make an admin:** in Firestore create a collection `admins` with a document whose ID is the admin's **User UID** (from Authentication → Users). Fields are not needed. Admins can then create global events; the rules check this collection on the server.

The Firebase web config is not a secret – access to the data is controlled by the [security rules](firestore.rules).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on an Android device / emulator |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for task rules, dates and the notification plan |
| `npm run test:rules` | Firestore security rules tests in the emulator (needs Java) |
| `npm run build:apk` | Build an installable Android APK with EAS |
| `npm run cleanup:db -- <key.json> [--apply]` | Remove stale data (see below) |

## Project structure

```
App.js                     Navigation, theme/language providers, splash and session restore
FireBaseConfig.js          Firebase app, Auth (persistent on the device) and Firestore
firestore.rules            Security rules (tested in tests/firestore.rules.test.mjs)
components/
  auth/                    Login and registration
  navigation/              Bottom navigation bar
  screens/
    Main/                  Home: month header, month grid, agenda
    UserCalendar/          Personal calendar: day strip, day timeline
    AddTask/               Create / edit a task, color and tag pickers
    CompletedTasks/        Completed / uncompleted history
    Alerts/                Notification history
    Settings/              Profile, personal info, account, language, theme, notifications
    calendarShared.js      Hooks shared by both calendars (filters, participants, details modal)
  ui/                      Reusable components (Avatar, GlobalEventCard, EventDetailsModal,
                           DatePickerSheet, SegmentedToggle, SearchBar, FilterPanel, ...)
services/
  tasksService.js          Tasks in Firestore: create, update, delete, join/leave, completion
  taskRules.js             Pure task and date rules (no Firebase, unit tested)
  notificationPlan.js      Which reminders a task gets and their texts (unit tested)
  notificationsService.js  Scheduling, syncing and recording notifications
  messagesService.js       Notification history in Firestore
  userService.js           Profiles and the saved sign-in session
  accountService.js        Email/password change and account deletion
  profilePhoto.js          Picking and storing the profile photo
contexts/ThemeContext.js   Light / dark theme
i18n/                      Translations (en, uk, pl), translator and date/time formatting
tests/                     Unit tests and security rules tests
scripts/cleanup-db.mjs     Admin script for cleaning the database
```

## Data model (Firestore)

| Collection | Document | Main fields |
|---|---|---|
| `users` | user UID | `name`, `surname`, `photo` (small JPEG data URI) |
| `tasks` | auto ID | `userId`, `name`, `description`, `date` (`DD.MM.YYYY`), `dateTimestamp`, `time` or `timeDilation` + `fromTime` / `toTime`, `tagText`, `taskColor`, `frequency`, `isCompleted` / `isUncompleted`; for global events also `isGlobal`, `participants`, `userCompletions` |
| `messages` | auto ID | `userId`, `taskId`, `type`, `title`, `body`, `createdAt`, `month`, `year` |
| `admins` | user UID | – (the document's existence makes the user an admin) |

**Security rules in short:** everybody signed in can read profiles and global events; users can only change their own tasks, join or leave events for themselves, change only their own completion status and add only themselves to `completedBy`; only admins create, edit or delete global events; profile photos are size-limited; the `admins` collection cannot be written from the app.

## Testing

```bash
npm run lint
npm test
npm run test:rules
```

On Windows with a non-ASCII user name, the Firestore emulator needs an ASCII temp folder for Java:

```bash
JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:\\tmp" npm run test:rules
```

## Building an APK

The project uses [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli login
npm run build:apk
```

When the build finishes, EAS prints a link to download the `.apk`. Before a new release, raise `expo.version` and `expo.android.versionCode` in [`app.json`](app.json) – a higher `versionCode` lets the new APK install over the old one.

## Database maintenance

[`scripts/cleanup-db.mjs`](scripts/cleanup-db.mjs) removes stale data with the Firebase Admin SDK: data of deleted accounts, their places in global events, messages of deleted tasks or from previous months, and, with options, all past tasks (`--past-tasks`) or every account except the listed ones (`--keep-only=a@x.com,b@y.com`).

It needs a service account key (Firebase console → Project settings → Service accounts → *Generate new private key*). Keep the key outside the repository and revoke it afterwards.

```bash
npm run cleanup:db -- path/to/key.json            # dry run: only reports
npm run cleanup:db -- path/to/key.json --apply    # applies the changes
```
