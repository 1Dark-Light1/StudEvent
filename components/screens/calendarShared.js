/**
 * State and helpers shared by the Home (month) and personal (week) calendar screens.
 */
import { useCallback, useEffect, useState } from 'react';
import { getUsersDataByIds } from '../../services/userService';

/** Search text and selected tag filters. */
export function useTaskFilters() {
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedTags, setSelectedTags] = useState([]);

   const toggleTag = useCallback((tag) => {
      setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
   }, []);
   const clearTags = useCallback(() => setSelectedTags([]), []);
   const clearSearch = useCallback(() => setSearchQuery(''), []);
   const resetFilters = useCallback(() => {
      setSearchQuery('');
      setSelectedTags([]);
   }, []);

   return { searchQuery, setSearchQuery, clearSearch, selectedTags, toggleTag, clearTags, resetFilters };
}

/**
 * Participant profiles of the global tasks in `tasks`, keyed by task id.
 * Reloaded whenever the tasks change, so newly joined users show up.
 */
export function useParticipants(tasks) {
   const [participants, setParticipants] = useState({});

   useEffect(() => {
      let cancelled = false;
      const withParticipants = tasks.filter((task) => task.isGlobal && task.participants?.length > 0);

      (async () => {
         const loaded = {};
         for (const task of withParticipants) {
            loaded[task.id] = await getUsersDataByIds(task.participants);
         }
         if (!cancelled) setParticipants(loaded);
      })();

      return () => {
         cancelled = true;
      };
   }, [tasks]);

   return participants;
}

/** Data the EventDetailsModal expects for a task. */
export function toEventDetails(task, { time, color, tone }) {
   return {
      id: task.id,
      title: task.name,
      subtitle: task.description,
      time,
      color,
      tone,
      date: task.date,
      tagText: task.tagText,
      name: task.name,
      description: task.description,
      isGlobal: task.isGlobal || false,
      timeDilation: task.timeDilation || false,
      fromTime: task.fromTime || null,
      toTime: task.toTime || null,
   };
}

/** Selected event and visibility of the event details modal. */
export function useEventModal() {
   const [selectedEvent, setSelectedEvent] = useState(null);
   const open = useCallback((event) => setSelectedEvent(event), []);
   const close = useCallback(() => setSelectedEvent(null), []);
   return { selectedEvent, isVisible: selectedEvent !== null, open, close };
}
