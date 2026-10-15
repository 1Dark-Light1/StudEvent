import React, { useState, useEffect } from 'react';
import {
   View,
   Text,
   ScrollView,
   TextInput,
   Pressable,
   Platform,
   Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import SearchBar from '../../ui/SearchBar';
import SegmentedToggle from '../../ui/SegmentedToggle';
import DatePickerSheet from '../../ui/DatePickerSheet';
import ColorPickerModal from './ColorPickerModal';
import TagPickerModal from './TagPickerModal';
import { auth } from '../../../FireBaseConfig';
import { addTask, updateTask, subscribeToUserTasks, isAdmin } from '../../../services/tasksService';
import { compareDateStrings } from '../../../services/taskRules';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { styles } from './AddTaskScreen.styles';

export default function AddTaskScreen({ navigation, route }) {
   const { t, tagLabel, errorText } = useI18n();
   const { colors, isDark } = useTheme();
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
         Alert.alert(t('task.alert.authTitle'), t('task.alert.authBody'), [
            {
               text: t('common.ok'),
               onPress: () => navigation.navigate('Login'),
            },
         ]);
      }
   }, [navigation, t]);

   
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
         Alert.alert(t('task.alert.error'), errorText(error, 'task.alert.failed'));
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

               <SegmentedToggle
                  options={[
                     { value: 'build', label: t('task.build') },
                     { value: 'change', label: t('task.change') },
                  ]}
                  value={mode}
                  onChange={setMode}
                  minSegmentWidth={100}
                  style={styles.modeSelector}
               />

               {/* \u0421\u043f\u0438\u0441\u043e\u043a \u0442\u0430\u0441\u043a\u043e\u0432 \u0434\u043b\u044f \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f */}
               {mode === 'change' && !selectedTaskId && (
                  <View style={styles.tasksListContainer}>
                     <Text style={[styles.tasksListTitle, { color: colors.text }]}>{t('task.selectToEdit')}</Text>
                     
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
                                             {tagLabel(task.tagText)}
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
                           style={[styles.backToListButton, { backgroundColor: isDark ? colors.todayHighlight : colors.primary }]}
                           onPress={() => {
                              setSelectedTaskId(null);
                              handleClear();
                           }}
                        >
                           <Ionicons name="arrow-back" size={20} color="#fff" />
                           <Text style={[styles.backToListText, { color: '#fff' }]}>{t('task.backToList')}</Text>
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
                        {tagLabel(tagText) || t('task.selectTag')}
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
                        <Text style={[styles.selectedTagText, { color: colors.text }]}>{tagLabel(tagText)}</Text>
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
                           { backgroundColor: colors.iconBg, borderColor: colors.border },
                           frequency === 'once' && [styles.frequencyBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
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
                           { backgroundColor: colors.iconBg, borderColor: colors.border },
                           frequency === 'weekly' && [styles.frequencyBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
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
                           { backgroundColor: colors.iconBg, borderColor: colors.border },
                           frequency === 'custom' && [styles.frequencyBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
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
                                    setCustomDates([...customDates, dateToAdd].sort(compareDateStrings));
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
               <Pressable style={[styles.clearBtn, { backgroundColor: colors.iconBg }]} onPress={handleClear}>
                  <Text style={[styles.clearText, { color: colors.textSecondary }]}>{t('task.clear')}</Text>
               </Pressable>
               <Pressable 
                  style={[styles.addBtn, { backgroundColor: colors.primary }, isLoading && styles.addBtnDisabled]} 
                  onPress={handleAdd}
                  disabled={isLoading}
               >
                  <Text style={styles.addText}>
                     {isLoading
                        ? t(mode === 'change' ? 'task.updating' : 'task.adding')
                        : t(mode === 'change' ? 'task.updateButton' : 'task.addButton')}
                  </Text>
               </Pressable>
            </View>
         )}

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         <DatePickerSheet
            visible={showDatePicker}
            value={selectedDate}
            onConfirm={(date) => {
               setSelectedDate(date);
               setTaskDate(formatDate(date));
            }}
            onClose={() => setShowDatePicker(false)}
         />

         <DatePickerSheet
            visible={showCustomDatePicker}
            value={selectedDate}
            onConfirm={(date) => {
               setSelectedDate(date);
               setCustomDateInput(formatDate(date));
            }}
            onClose={() => setShowCustomDatePicker(false)}
         />

         <ColorPickerModal
            visible={showColorPicker}
            value={taskColor}
            palette={colorPalette}
            onSelect={setTaskColor}
            onClose={() => setShowColorPicker(false)}
         />

         <TagPickerModal
            visible={showTagPicker}
            value={tagText}
            tags={predefinedTags}
            onSelect={setTagText}
            onClose={() => setShowTagPicker(false)}
         />
      </View>
   );
}
