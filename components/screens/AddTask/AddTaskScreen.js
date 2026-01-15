import React, { useState, useEffect } from 'react';
import {
   View,
   Text,
   StyleSheet,
   ScrollView,
   TextInput,
   Pressable,
   Platform,
   Modal,
   Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomNav from '../../navigation/BottomNav';
import SearchBar from '../../ui/SearchBar';
import { auth } from '../../../FireBaseConfig';
import { addTask, updateTask, subscribeToUserTasks, isAdmin } from '../../../services/tasksService';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function AddTaskScreen({ navigation, route }) {
   const { t } = useI18n();
   const { colors } = useTheme();
   const [mode, setMode] = useState('build'); // 'build' or 'change'
   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [taskTime, setTaskTime] = useState('');
   const [taskDate, setTaskDate] = useState('');
   const [selectedDate, setSelectedDate] = useState(new Date());
   const [showDatePicker, setShowDatePicker] = useState(false);
   const [timeDilation, setTimeDilation] = useState(true);
   const [fromTime, setFromTime] = useState('');
   const [toTime, setToTime] = useState('');
   const [taskColor, setTaskColor] = useState('#4CAF50');
   const [tagText, setTagText] = useState('');
   const [showColorPicker, setShowColorPicker] = useState(false);
   const [frequency, setFrequency] = useState('once'); // 'once', 'weekly', 'custom'
   const [customDates, setCustomDates] = useState([]); // Array of dates for Custom frequency
   const [customDateInput, setCustomDateInput] = useState(''); // Temporary date input
   const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [showTagPicker, setShowTagPicker] = useState(false);
   const [customTagInput, setCustomTagInput] = useState('');
   
   // For edit mode
   const [allTasks, setAllTasks] = useState([]);
   const [filteredTasks, setFilteredTasks] = useState([]);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedTaskId, setSelectedTaskId] = useState(null);
   const [isTasksLoading, setIsTasksLoading] = useState(false);

   const activeRoute = route?.name ?? 'AddTask';

   // Predefined tags
   const predefinedTags = [
      'Work',
      'Study',
      'Personal',
      'Health',
      'Sport',
      'Home',
      'Finance',
      'Shopping',
      'Other',
   ];

   
   useEffect(() => {
      if (!auth.currentUser) {
         Alert.alert('Authentication Required', 'Please log in to add tasks.', [
            {
               text: 'OK',
               onPress: () => navigation.navigate('Login'),
            },
         ]);
      }
   }, [navigation]);

   
   useEffect(() => {
      if (mode === 'change' && auth.currentUser) {
         setIsTasksLoading(true);
         const unsubscribe = subscribeToUserTasks((loadedTasks) => {
            const userIsAdmin = isAdmin();
            // If user is not admin, filter out admin tasks
            const tasksToShow = userIsAdmin 
               ? loadedTasks 
               : loadedTasks.filter(task => !task.isGlobal || task.userId === auth.currentUser?.uid);
            setAllTasks(tasksToShow);
            setFilteredTasks(tasksToShow);
            setIsTasksLoading(false);
         });

         return () => {
            if (unsubscribe) unsubscribe();
         };
      }
   }, [mode]);

   // Filter tasks by search
   useEffect(() => {
      const userIsAdmin = isAdmin();
      let tasksToFilter = allTasks;
      
      // If user is not admin, additionally filter admin tasks
      if (!userIsAdmin) {
         tasksToFilter = allTasks.filter(task => !task.isGlobal || task.userId === auth.currentUser?.uid);
      }
      
      if (searchQuery.trim() === '') {
         setFilteredTasks(tasksToFilter);
      } else {
         const query = searchQuery.toLowerCase();
         const filtered = tasksToFilter.filter(task => 
            task.name?.toLowerCase().includes(query) || 
            task.description?.toLowerCase().includes(query) ||
            task.tagText?.toLowerCase().includes(query)
         );
         setFilteredTasks(filtered);
      }
   }, [searchQuery, allTasks]);

   // Color palette
   const colorPalette = [
      '#4CAF50', // green
      '#2196F3', // blue
      '#FF9800', // orange
      '#F44336', // red
      '#9C27B0', // purple
      '#00BCD4', // turquoise
      '#FFEB3B', // yellow
      '#795548', // brown
      '#607D8B', // gray-blue
      '#E91E63', // pink
      '#3F51B5', // indigo
      '#009688', // teal
   ];

   const handleClear = () => {
      setName('');
      setDescription('');
      setTaskTime('');
      setTaskDate('');
      setFromTime('');
      setToTime('');
      setTagText('');
      setFrequency('once');
      setCustomDates([]);
      setCustomDateInput('');
      setSelectedTaskId(null);
   };

   // Load selected task into form for editing
   const handleSelectTask = (task) => {
      setSelectedTaskId(task.id);
      setName(task.name || '');
      setDescription(task.description || '');
      setTaskDate(task.date || '');
      setTaskColor(task.taskColor || '#4CAF50');
      setTagText(task.tagText || '');
      setFrequency(task.frequency || 'once');
      
      if (task.timeDilation) {
         setTimeDilation(true);
         setFromTime(task.fromTime || '');
         setToTime(task.toTime || '');
         setTaskTime('');
      } else {
         setTimeDilation(false);
         setTaskTime(task.time || '');
         setFromTime('');
         setToTime('');
      }
      
      // Scroll down to the form
      // ScrollView will automatically scroll when the form becomes active
   };

   // Search handlers
   const handleSearchChange = (text) => {
      setSearchQuery(text);
   };

   const handleSearchClear = () => {
      setSearchQuery('');
   };

   const handleAdd = async () => {
      // Authentication check
      if (!auth.currentUser) {
         Alert.alert(t('task.alert.authRequired'), t('task.alert.loginRequired'), [
            {
               text: t('common.ok'),
               onPress: () => navigation.navigate('Login'),
            },
         ]);
         return;
      }

      // Validate required fields
      if (!name.trim()) {
         Alert.alert(t('task.alert.error'), t('task.alert.nameRequired'));
         return;
      }

      if (!description.trim()) {
         Alert.alert(t('task.alert.error'), t('task.alert.descriptionRequired'));
         return;
      }

      if (!taskTime.trim() && !timeDilation) {
         Alert.alert(t('task.alert.error'), t('task.alert.timeRequired'));
         return;
      }

      if (timeDilation && (!fromTime.trim() || !toTime.trim())) {
         Alert.alert(t('task.alert.error'), t('task.alert.fromToRequired'));
         return;
      }

      if (!taskDate.trim()) {
         Alert.alert(t('task.alert.error'), t('task.alert.dateRequired'));
         return;
      }

      if (!tagText.trim()) {
         Alert.alert(t('task.alert.error'), t('task.alert.tagsRequired'));
         return;
      }

      if (frequency === 'custom' && customDates.length === 0) {
         Alert.alert(t('task.alert.error'), t('task.alert.customDateRequired'));
         return;
      }

      setIsLoading(true);

      try {
         const taskData = {
            name: name.trim(),
            description: description.trim(),
            date: taskDate,
            time: timeDilation ? null : taskTime.trim(),
            timeDilation: timeDilation,
            fromTime: timeDilation ? fromTime.trim() : null,
            toTime: timeDilation ? toTime.trim() : null,
            tagText: tagText.trim(),
            taskColor: taskColor,
            frequency: frequency,
            customDates: frequency === 'custom' ? customDates : undefined,
         };

         if (mode === 'change' && selectedTaskId) {
            // Edit mode
            await updateTask(selectedTaskId, taskData);
            
            Alert.alert(t('task.alert.success'), t('task.alert.updated'), [
               {
                  text: t('common.ok'),
                  onPress: () => {
                     handleClear();
                     setMode('build');
                  },
               },
            ]);
         } else {
            // Add mode
            await addTask(taskData);
            
            Alert.alert(t('task.alert.success'), t('task.alert.added'), [
               {
                  text: t('common.ok'),
                  onPress: () => {
                     handleClear();
                     navigation.goBack();
                  },
               },
            ]);
         }
      } catch (error) {
         console.error('Error with task:', error);
         Alert.alert(t('task.alert.error'), error.message || t('task.alert.failed'));
      } finally {
         setIsLoading(false);
      }
   };

   const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
   };

   const onDateChange = (event, date) => {
      if (Platform.OS === 'android') {
         setShowDatePicker(false);
      }
      if (date) {
         setSelectedDate(date);
         setTaskDate(formatDate(date));
      }
      if (Platform.OS === 'android' && event.type === 'dismissed') {
         setShowDatePicker(false);
      }
   };

   const showDatePickerModal = () => {
      if (Platform.OS === 'ios') {
         setShowDatePicker(true);
      } else {
         setShowDatePicker(true);
      }
   };

   // Format time to HH:MM format
   const formatTime = (text) => {
      // Remove all characters except digits
      const numbers = text.replace(/\D/g, '');

      // Limit to 4 digits
      const limited = numbers.slice(0, 4);

      // Add colon after the second digit
      if (limited.length <= 2) {
         return limited;
      }
      return limited.slice(0, 2) + ':' + limited.slice(2, 4);
   };

   const handleTimeChange = (text, setter) => {
      const formatted = formatTime(text);
      setter(formatted);
   };

   return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
         <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
         >
            <View style={styles.container}>
               <Text style={[styles.title, { color: colors.text }]}>{t('task.add')}</Text>

               {/* Mode selector */}
               <LinearGradient
                  colors={colors.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modeSelector}
               >
                  <Pressable
                     style={[styles.modeBtn, mode === 'build' && [styles.modeBtnActive, { backgroundColor: colors.surface }]]}
                     onPress={() => setMode('build')}
                  >
                     <Text 
                        style={[
                           styles.modeText,
                           { color: mode === 'build' ? colors.text : '#fff' },
                           mode === 'build' && styles.modeTextActive
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                     >
                        {t('task.build')}
                     </Text>
                  </Pressable>

                  <Pressable
                     style={[styles.modeBtn, mode === 'change' && [styles.modeBtnActive, { backgroundColor: colors.surface }]]}
                     onPress={() => setMode('change')}
                  >
                     <Text 
                        style={[
                           styles.modeText,
                           { color: mode === 'change' ? colors.text : '#fff' },
                           mode === 'change' && styles.modeTextActive
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                     >
                        {t('task.change')}
                     </Text>
                  </Pressable>
               </LinearGradient>

               {/* \u0421\u043f\u0438\u0441\u043e\u043a \u0442\u0430\u0441\u043a\u043e\u0432 \u0434\u043b\u044f \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f */}
               {mode === 'change' && !selectedTaskId && (
                  <View style={styles.tasksListContainer}>
                     <Text style={styles.tasksListTitle}>{t('task.selectToEdit')}</Text>
                     
                     <SearchBar
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        onClear={handleSearchClear}
                        placeholder={t('field.searchTasks')}
                     />

                     {isTasksLoading ? (
                        <View style={styles.loadingContainer}>
                           <Text style={styles.loadingText}>{t('task.loading')}</Text>
                        </View>
                     ) : filteredTasks.length === 0 ? (
                        <View style={styles.emptyContainer}>
                           <Ionicons name="calendar-outline" size={48} color="#d0d8ec" />
                           <Text style={styles.emptyText}>
                              {searchQuery ? t('task.noTasksFound') : t('task.noTasksAvailable')}
                           </Text>
                        </View>
                     ) : (
                        <View style={styles.tasksList}>
                           {filteredTasks.slice(0, 20).map((task) => (
                              <Pressable
                                 key={task.id}
                                 style={({ pressed }) => [
                                    styles.taskItem,
                                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    pressed && styles.taskItemPressed
                                 ]}
                                 onPress={() => handleSelectTask(task)}
                              >
                                 <View style={[styles.taskColorIndicator, { backgroundColor: task.taskColor || colors.primary }]} />
                                 <View style={styles.taskInfo}>
                                    <Text style={[styles.taskName, { color: colors.text }]} numberOfLines={1}>{task.name}</Text>
                                    <Text style={[styles.taskDetails, { color: colors.textSecondary }]} numberOfLines={1}>
                                       {task.date} {task.time && `\u2022 ${task.time}`}
                                    </Text>
                                    {task.tagText && (
                                       <View style={[styles.taskTag, { backgroundColor: task.taskColor + '20' }]}>
                                          <Text style={[styles.taskTagText, { color: task.taskColor }]}>
                                             {task.tagText}
                                          </Text>
                                       </View>
                                    )}
                                 </View>
                                 <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                              </Pressable>
                           ))}
                        </View>
                     )}
                  </View>
               )}

               {/* \u0424\u043e\u0440\u043c\u0430 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f (\u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0432 build \u0438\u043b\u0438 \u043a\u043e\u0433\u0434\u0430 \u0432\u044b\u0431\u0440\u0430\u043d \u0442\u0430\u0441\u043a) */}
               {(mode === 'build' || (mode === 'change' && selectedTaskId)) && (
                  <>
                     {mode === 'change' && selectedTaskId && (
                        <Pressable 
                           style={styles.backToListButton}
                           onPress={() => {
                              setSelectedTaskId(null);
                              handleClear();
                           }}
                        >
                           <Ionicons name="arrow-back" size={20} color={colors.primary} />
                           <Text style={[styles.backToListText, { color: colors.primary }]}>{t('task.backToList')}</Text>
                        </Pressable>
                     )}

                     {/* Name field */}
                     <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.text }]}>
                           {t('task.name')} <Text style={[styles.required, { color: colors.error }]}>{t('task.required')}</Text>
                        </Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                           <TextInput
                              style={[styles.input, { color: colors.text }]}
                              placeholder={t('task.namePlaceholder')}
                              placeholderTextColor={colors.textMuted}
                              value={name}
                              onChangeText={setName}
                              editable={true}
                              autoCorrect={false}
                           />
                        </View>
                     </View>

                     {/* Description field */}
                     <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>
                     {t('task.description')} <Text style={[styles.required, { color: colors.error }]}>{t('task.required')}</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                     <TextInput
                        style={[styles.input, styles.textArea, { color: colors.text }]}
                        placeholder={t('task.descriptionPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        editable={true}
                        autoCorrect={false}
                     />
                  </View>
               </View>

               {/* Time and Date */}
               <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>
                     {t('task.timeDate')} <Text style={[styles.required, { color: colors.error }]}>{t('task.required')}</Text>
                  </Text>
                  <View style={styles.row}>
                     <View
                        style={[
                           styles.inputContainer,
                           styles.halfWidth,
                           { backgroundColor: colors.cardBackground, borderColor: colors.border },
                           timeDilation && [styles.inputContainerDisabled, { backgroundColor: colors.iconBg }]
                        ]}
                        pointerEvents={timeDilation ? "none" : "box-none"}
                     >
                        <TextInput
                           style={[styles.input, { color: colors.text }, timeDilation && styles.inputDisabled]}
                           placeholder={t('task.timePlaceholder')}
                           placeholderTextColor={timeDilation ? colors.textMuted : colors.textMuted}
                           value={timeDilation ? "" : taskTime}
                           onChangeText={(text) => handleTimeChange(text, setTaskTime)}
                           editable={!timeDilation}
                           autoCorrect={false}
                           keyboardType="numeric"
                           maxLength={5}
                        />
                        <Ionicons
                           name="time-outline"
                           size={20}
                           color={timeDilation ? colors.textMuted : colors.textMuted}
                           style={styles.inputIcon}
                        />
                     </View>
                     <View style={[styles.inputContainer, styles.halfWidth, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder={t('task.datePlaceholder')}
                           placeholderTextColor={colors.textMuted}
                           value={taskDate}
                           onChangeText={setTaskDate}
                           editable={false}
                           autoCorrect={false}
                        />
                        <Pressable onPress={showDatePickerModal} style={styles.iconButton}>
                           <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                        </Pressable>
                     </View>
                  </View>
               </View>

               {/* Time dilation */}
               <View style={styles.section}>
                  <View style={styles.rowBetween}>
                     <Text style={[styles.label, { color: colors.text }]}>{t('task.timeDilation')}</Text>
                     <Pressable
                        style={[styles.toggle, { backgroundColor: colors.border }, timeDilation && [styles.toggleActive, { backgroundColor: colors.primary }]]}
                        onPress={() => setTimeDilation(!timeDilation)}
                     >
                        <View style={[styles.toggleThumb, { backgroundColor: colors.surface }, timeDilation && styles.toggleThumbActive]} />
                     </Pressable>
                  </View>
                  {timeDilation && (
                     <View style={[styles.row, styles.timeDilationFields]}>
                        <View style={[styles.inputContainer, styles.halfWidth, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                           <TextInput
                              style={[styles.input, { color: colors.text }]}
                              placeholder={t('task.fromPlaceholder')}
                              placeholderTextColor={colors.textMuted}
                              value={fromTime}
                              onChangeText={(text) => handleTimeChange(text, setFromTime)}
                              editable={true}
                              autoCorrect={false}
                              keyboardType="numeric"
                              maxLength={5}
                           />
                           <Ionicons name="time-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                        </View>
                        <View style={[styles.inputContainer, styles.halfWidth, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                           <TextInput
                              style={[styles.input, { color: colors.text }]}
                              placeholder={t('task.toPlaceholder')}
                              placeholderTextColor={colors.textMuted}
                              value={toTime}
                              onChangeText={(text) => handleTimeChange(text, setToTime)}
                              editable={true}
                              autoCorrect={false}
                              keyboardType="numeric"
                              maxLength={5}
                           />
                           <Ionicons name="time-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                        </View>
                     </View>
                  )}
               </View>

               {/* Tags */}
               <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>
                     {t('task.tags')} <Text style={[styles.required, { color: colors.error }]}>{t('task.required')}</Text>
                  </Text>
                  <Pressable
                     style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                     onPress={() => setShowTagPicker(true)}
                  >
                     <View style={[styles.colorDot, { backgroundColor: taskColor }]} />
                     <Text style={[styles.input, { color: colors.text }, !tagText && [styles.placeholderText, { color: colors.textMuted }]]}>
                        {tagText || t('task.selectTag')}
                     </Text>
                     <Pressable 
                        style={styles.colorBtn} 
                        onPress={(e) => {
                           e.stopPropagation();
                           setShowColorPicker(true);
                        }}
                     >
                        <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                     </Pressable>
                  </Pressable>
                  {tagText && (
                     <View style={[styles.selectedTagContainer, { backgroundColor: colors.iconBg }]}>
                        <Text style={[styles.selectedTagText, { color: colors.text }]}>{tagText}</Text>
                        <Pressable onPress={() => setTagText('')}>
                           <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </Pressable>
                     </View>
                  )}
               </View>

               {/* Frequency */}
               <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('task.frequency')}</Text>
                  <View style={styles.frequencyRow}>
                     <Pressable
                        style={[
                           styles.frequencyBtn,
                           { backgroundColor: colors.iconBg },
                           frequency === 'once' && [styles.frequencyBtnActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setFrequency('once')}
                     >
                        <Text
                           style={[
                              styles.frequencyText,
                              { color: frequency === 'once' ? '#fff' : colors.textSecondary },
                              frequency === 'once' && styles.frequencyTextActive,
                           ]}
                        >
                           {t('task.once')}
                        </Text>
                     </Pressable>
                     <Pressable
                        style={[
                           styles.frequencyBtn,
                           { backgroundColor: colors.iconBg },
                           frequency === 'weekly' && [styles.frequencyBtnActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setFrequency('weekly')}
                     >
                        <Text
                           style={[
                              styles.frequencyText,
                              { color: frequency === 'weekly' ? '#fff' : colors.textSecondary },
                              frequency === 'weekly' && styles.frequencyTextActive,
                           ]}
                        >
                           {t('task.weekly')}
                        </Text>
                     </Pressable>
                     <Pressable
                        style={[
                           styles.frequencyBtn,
                           { backgroundColor: colors.iconBg },
                           frequency === 'custom' && [styles.frequencyBtnActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setFrequency('custom')}
                     >
                        <Text
                           style={[
                              styles.frequencyText,
                              { color: frequency === 'custom' ? '#fff' : colors.textSecondary },
                              frequency === 'custom' && styles.frequencyTextActive,
                           ]}
                        >
                           {t('task.custom')}
                        </Text>
                     </Pressable>
                  </View>
                  
                  {/* Custom dates input */}
                  {frequency === 'custom' && (
                     <View style={styles.customDatesSection}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('task.addDates')}</Text>
                        <View style={styles.customDateInputRow}>
                           <View style={[styles.inputContainer, styles.flex1, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} pointerEvents="box-none">
                              <TextInput
                                 style={[styles.input, { color: colors.text }]}
                                 placeholder={t('task.dateFormat')}
                                 placeholderTextColor={colors.textMuted}
                                 value={customDateInput}
                                 onChangeText={setCustomDateInput}
                                 editable={true}
                                 autoCorrect={false}
                              />
                              <Pressable 
                                 onPress={() => {
                                    const date = new Date();
                                    setSelectedDate(date);
                                    setShowCustomDatePicker(true);
                                 }} 
                                 style={styles.iconButton}
                              >
                                 <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                              </Pressable>
                           </View>
                           <Pressable
                              style={[styles.addDateBtn, { backgroundColor: colors.primary }]}
                              onPress={() => {
                                 const dateToAdd = customDateInput.trim() || formatDate(selectedDate);
                                 if (dateToAdd && !customDates.includes(dateToAdd)) {
                                    setCustomDates([...customDates, dateToAdd].sort());
                                    setCustomDateInput('');
                                 }
                              }}
                           >
                              <Ionicons name="add" size={20} color="#fff" />
                           </Pressable>
                        </View>
                        
                        {/* List of added dates */}
                        {customDates.length > 0 && (
                           <View style={styles.customDatesList}>
                              {customDates.map((date, index) => (
                                 <View key={index} style={[styles.customDateTag, { backgroundColor: colors.iconBg }]}>
                                    <Text style={[styles.customDateText, { color: colors.text }]}>{date}</Text>
                                    <Pressable
                                       onPress={() => {
                                          setCustomDates(customDates.filter((_, i) => i !== index));
                                       }}
                                       style={styles.removeDateBtn}
                                    >
                                       <Ionicons name="close" size={16} color={colors.textMuted} />
                                    </Pressable>
                                 </View>
                              ))}
                           </View>
                        )}
                     </View>
                  )}
               </View>
               </>
            )}
            </View>
         </ScrollView>

         {/* Action buttons - fixed above bottom nav */}
         {(mode === 'build' || (mode === 'change' && selectedTaskId)) && (
            <View style={styles.fixedActionRow}>
               <Pressable style={styles.clearBtn} onPress={handleClear}>
                  <Text style={styles.clearText}>{t('task.clear')}</Text>
               </Pressable>
               <Pressable 
                  style={[styles.addBtn, { backgroundColor: colors.primary }, isLoading && styles.addBtnDisabled]} 
                  onPress={handleAdd}
                  disabled={isLoading}
               >
                  <Text style={styles.addText}>
                     {isLoading ? (mode === 'change' ? 'Updating...' : 'Adding...') : (mode === 'change' ? 'Update' : 'Add')}
                  </Text>
               </Pressable>
            </View>
         )}

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         {/* Date Picker Modal for iOS */}
         {Platform.OS === 'ios' && showDatePicker && (
            <Modal
               visible={showDatePicker}
               transparent={true}
               animationType="slide"
               onRequestClose={() => setShowDatePicker(false)}
            >
               <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                     <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowDatePicker(false)}>
                           <Text style={styles.modalCancel}>{t('task.cancel')}</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>{t('task.selectDate')}</Text>
                        <Pressable
                           onPress={() => {
                              setTaskDate(formatDate(selectedDate));
                              setShowDatePicker(false);
                           }}
                        >
                           <Text style={styles.modalDone}>{t('task.done')}</Text>
                        </Pressable>
                     </View>
                     <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        style={styles.datePicker}
                     />
                  </View>
               </View>
            </Modal>
         )}

         {/* Date Picker for Android */}
         {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
               value={selectedDate}
               mode="date"
               display="default"
               onChange={onDateChange}
            />
         )}

         {/* Custom Date Picker Modal for iOS */}
         {Platform.OS === 'ios' && showCustomDatePicker && (
            <Modal
               visible={showCustomDatePicker}
               transparent={true}
               animationType="slide"
               onRequestClose={() => setShowCustomDatePicker(false)}
            >
               <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                     <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowCustomDatePicker(false)}>
                           <Text style={styles.modalCancel}>{t('task.cancel')}</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>{t('task.selectDate')}</Text>
                        <Pressable
                           onPress={() => {
                              setCustomDateInput(formatDate(selectedDate));
                              setShowCustomDatePicker(false);
                           }}
                        >
                           <Text style={styles.modalDone}>Done</Text>
                        </Pressable>
                     </View>
                     <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => {
                           if (Platform.OS === 'android') {
                              setShowCustomDatePicker(false);
                           }
                           if (date) {
                              setSelectedDate(date);
                              if (Platform.OS === 'android') {
                                 setCustomDateInput(formatDate(date));
                              }
                           }
                        }}
                        style={styles.datePicker}
                     />
                  </View>
               </View>
            </Modal>
         )}

         {/* Custom Date Picker for Android */}
         {Platform.OS === 'android' && showCustomDatePicker && (
            <DateTimePicker
               value={selectedDate}
               mode="date"
               display="default"
               onChange={(event, date) => {
                  setShowCustomDatePicker(false);
                  if (date) {
                     setSelectedDate(date);
                     setCustomDateInput(formatDate(date));
                  }
               }}
            />
         )}

         {/* Color Picker Modal */}
         <Modal
            visible={showColorPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowColorPicker(false)}
         >
            <Pressable style={styles.colorModalOverlay} onPress={() => setShowColorPicker(false)}>
               <View style={[styles.colorModalContent, { backgroundColor: colors.cardBackground }]} onStartShouldSetResponder={() => true}>
                  <View style={styles.colorModalHeader}>
                     <Text style={[styles.colorModalTitle, { color: colors.text }]}>{t('task.chooseColor')}</Text>
                     <Pressable onPress={() => setShowColorPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                     </Pressable>
                  </View>
                  <View style={styles.colorGrid}>
                     {colorPalette.map((color) => (
                        <Pressable
                           key={color}
                           style={[
                              styles.colorOption,
                              { backgroundColor: color },
                              taskColor === color && styles.colorOptionSelected,
                           ]}
                           onPress={() => {
                              setTaskColor(color);
                              setShowColorPicker(false);
                           }}
                        >
                           {taskColor === color && (
                              <Ionicons name="checkmark" size={20} color="#fff" />
                           )}
                        </Pressable>
                     ))}
                  </View>
               </View>
            </Pressable>
         </Modal>

         {/* Tag Picker Modal */}
         <Modal
            visible={showTagPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTagPicker(false)}
         >
            <Pressable 
               style={styles.tagModalOverlay} 
               onPress={() => setShowTagPicker(false)}
            >
               <View 
                  style={[styles.tagModalContent, { backgroundColor: colors.cardBackground }]} 
                  onStartShouldSetResponder={() => true}
               >
                  <View style={styles.tagModalHeader}>
                     <Text style={[styles.tagModalTitle, { color: colors.text }]}>{t('task.selectTag')}</Text>
                     <Pressable onPress={() => setShowTagPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                     </Pressable>
                  </View>
                  
                  <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
                     {predefinedTags.map((tag) => (
                        <Pressable
                           key={tag}
                           style={[
                              styles.tagOption,
                              { backgroundColor: colors.iconBg },
                              tagText === tag && [styles.tagOptionSelected, { backgroundColor: colors.primary }],
                           ]}
                           onPress={() => {
                              setTagText(tag);
                              setShowTagPicker(false);
                           }}
                        >
                           <Text
                              style={[
                                 styles.tagOptionText,
                                 { color: colors.text },
                                 tagText === tag && [styles.tagOptionTextSelected, { color: '#fff' }],
                              ]}
                           >
                              {tag}
                           </Text>
                           {tagText === tag && (
                              <Ionicons name="checkmark" size={20} color="#fff" />
                           )}
                        </Pressable>
                     ))}
                  </ScrollView>

                  <View style={styles.customTagSection}>
                     <Text style={[styles.customTagLabel, { color: colors.text }]}>{t('task.customTag')}</Text>
                     <View style={[styles.customTagInputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <TextInput
                           style={[styles.customTagInput, { color: colors.text }]}
                           placeholder={t('task.customTagPlaceholder')}
                           placeholderTextColor={colors.textMuted}
                           value={customTagInput}
                           onChangeText={setCustomTagInput}
                           autoCorrect={false}
                        />
                        <Pressable
                           style={[
                              styles.addCustomTagBtn,
                              { backgroundColor: colors.primary },
                              !customTagInput.trim() && [styles.addCustomTagBtnDisabled, { backgroundColor: colors.border }],
                           ]}
                           onPress={() => {
                              if (customTagInput.trim()) {
                                 setTagText(customTagInput.trim());
                                 setCustomTagInput('');
                                 setShowTagPicker(false);
                              }
                           }}
                           disabled={!customTagInput.trim()}
                        >
                           <Ionicons name="add" size={20} color="#fff" />
                        </Pressable>
                     </View>
                  </View>
               </View>
            </Pressable>
         </Modal>
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
   },
   scroll: {
      paddingBottom: 180,
   },
   container: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 24,
   },
   title: {
      fontSize: 32,
      fontWeight: '700',
      marginBottom: 24,
      textAlign: 'center',
   },
   modeSelector: {
      alignSelf: 'center',
      flexDirection: 'row',
      borderRadius: 40,
      padding: 5,
      marginBottom: 24,
      overflow: 'hidden',
      minHeight: 50,
   },
   modeBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      minWidth: 100,
   },
   modeBtnActive: {
   },
   modeText: {
      fontSize: 15,
      fontWeight: '600',
   },
   modeTextActive: {
   },
   section: {
      marginBottom: 20,
   },
   label: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
      flexWrap: 'wrap',
   },
   required: {
   },
   inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      minHeight: 48,
      borderWidth: 1,
   },
   input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      padding: 0,
      margin: 0,
   },
   inputDisabled: {
      color: '#9AA7B8',
   },
   inputContainerDisabled: {
      backgroundColor: '#E0E4E8',
   },
   textArea: {
      minHeight: 60,
      maxHeight: 120,
      textAlignVertical: 'top',
      paddingTop: Platform.OS === 'ios' ? 8 : 6,
      paddingBottom: Platform.OS === 'ios' ? 8 : 6,
   },
   inputIcon: {
      marginLeft: 8,
      pointerEvents: 'none',
   },
   row: {
      flexDirection: 'row',
      gap: 12,
   },
   timeDilationFields: {
      marginTop: 16,
   },
   rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
   },
   halfWidth: {
      flex: 1,
   },
   toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#E3E8F4',
      justifyContent: 'center',
      paddingHorizontal: 3,
   },
   toggleActive: {
      backgroundColor: '#2F7BFF',
   },
   toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
      alignSelf: 'flex-start',
   },
   toggleThumbActive: {
      alignSelf: 'flex-end',
   },
   colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 8,
      pointerEvents: 'none',
   },
   colorBtn: {
      padding: 4,
   },
   frequencyRow: {
      flexDirection: 'row',
      gap: 12,
   },
   frequencyBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 40,
      borderWidth: 2.5,
      borderColor: '#E3E8F4',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
   },
   frequencyBtnActive: {
      backgroundColor: '#F0F4F8',
      borderColor: '#838282ff',
   },
   frequencyText: {
      fontSize: 14,
      color: '#7A8BA3',
      fontWeight: '600',
      textAlign: 'center',
      flexWrap: 'wrap',
   },
   frequencyTextActive: {
      color: '#838282ff',
   },
   fixedActionRow: {
      position: 'absolute',
      bottom: 100,
      left: 24,
      right: 24,
      flexDirection: 'row',
      gap: 12,
      paddingTop: 12,
      paddingBottom: 8,
      elevation: 5,
   },
   actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      marginBottom: 24,
   },
   clearBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 40,
      backgroundColor: '#F1F6FF',
      alignItems: 'center',
   },
   clearText: {
      fontSize: 16,
      color: '#7A8BA3',
      fontWeight: '600',
   },
   addBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 40,
      backgroundColor: '#2F7BFF',
      alignItems: 'center',
      shadowColor: '#2F7BFF',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
   },
   addText: {
      fontSize: 16,
      color: '#fff',
      fontWeight: '700',
   },
   addBtnDisabled: {
      opacity: 0.6,
   },
   iconButton: {
      padding: 4,
   },
   modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
   },
   modalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
   },
   modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E3E8F4',
   },
   modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1B2430',
   },
   modalCancel: {
      fontSize: 16,
      color: '#6B7A8F',
   },
   modalDone: {
      fontSize: 16,
      color: '#2F7BFF',
      fontWeight: '600',
   },
   datePicker: {
      width: '100%',
   },
   colorModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
   },
   colorModalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 20,
      width: '85%',
      maxWidth: 400,
   },
   colorModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
   },
   colorModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1B2430',
   },
   colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
   },
   colorOption: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
   },
   colorOptionSelected: {
      borderColor: '#2F7BFF',
      borderWidth: 3,
   },
   customDatesSection: {
      marginTop: 16,
   },
   customDateInputRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
   },
   flex1: {
      flex: 1,
   },
   addDateBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#F0F4F8',
      alignItems: 'center',
      justifyContent: 'center',
   },
   customDatesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
   },
   customDateTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E3E8F4',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 6,
      minHeight: 32,
   },
   customDateText: {
      fontSize: 14,
      color: '#3D4C66',
      fontWeight: '600',
   },
   removeDateBtn: {
      padding: 2,
   },
   placeholderText: {
      color: '#6B7A8F',
   },
   selectedTagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#F0F4F8',
      borderRadius: 12,
      alignSelf: 'flex-start',
      gap: 8,
      minHeight: 36,
   },
   selectedTagText: {
      fontSize: 14,
      color: '#1B2430',
      fontWeight: '600',
   },
   tagModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
   },
   tagModalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: '70%',
   },
   tagModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E3E8F4',
   },
   tagModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1B2430',
   },
   tagList: {
      maxHeight: 300,
      paddingHorizontal: 20,
      paddingVertical: 12,
   },
   tagOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: '#F0F4F8',
      minHeight: 48,
   },
   tagOptionSelected: {
      backgroundColor: '#E3F2FD',
      borderWidth: 2,
      borderColor: '#2F7BFF',
   },
   tagOptionText: {
      fontSize: 16,
      color: '#1B2430',
      fontWeight: '500',
   },
   tagOptionTextSelected: {
      color: '#2F7BFF',
      fontWeight: '600',
   },
   customTagSection: {
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E3E8F4',
   },
   customTagLabel: {
      fontSize: 14,
      color: '#6B7A8F',
      marginBottom: 12,
      fontWeight: '500',
   },
   customTagInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
   },
   customTagInput: {
      flex: 1,
      backgroundColor: '#F0F4F8',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: '#1B2430',
      fontWeight: '500',
   },
   addCustomTagBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#2F7BFF',
      alignItems: 'center',
      justifyContent: 'center',
   },
   addCustomTagBtnDisabled: {
      backgroundColor: '#B0B8C4',
   },
   // Styles for task list
   tasksListContainer: {
      marginBottom: 24,
   },
   tasksListTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1B2430',
      marginBottom: 16,
   },
   loadingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
   },
   loadingText: {
      fontSize: 15,
      color: '#6B7A8F',
      marginTop: 12,
   },
   emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
   },
   emptyText: {
      fontSize: 15,
      color: '#9aa7bd',
      marginTop: 12,
   },
   tasksList: {
      marginTop: 12,
   },
   taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      borderWidth: 1,
      borderColor: '#f0f2f8',
   },
   taskItemPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
   },
   taskColorIndicator: {
      width: 4,
      height: 50,
      borderRadius: 2,
      marginRight: 12,
   },
   taskInfo: {
      flex: 1,
   },
   taskName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1B2430',
      marginBottom: 4,
   },
   taskDetails: {
      fontSize: 13,
      marginBottom: 6,
   },
   taskTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
   },
   taskTagText: {
      fontSize: 12,
      fontWeight: '600',
   },
   backToListButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#e3f2fd',
      borderRadius: 12,
      marginBottom: 20,
      gap: 8,
   },
   backToListText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#2f7cff',
   },
});

