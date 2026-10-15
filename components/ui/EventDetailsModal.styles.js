import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
   modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
   },
   modalContainer: {
      borderRadius: 30,
      maxHeight: '80%',
      minHeight: '60%',
      width: '100%',
      maxWidth: 500,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
      overflow: 'hidden',
   },
   header: {
      paddingTop: 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
   },
   headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
   },
   closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
   },
   headerLabel: {
      fontSize: 16,
      fontWeight: '600',
   },
   deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
   },
   deleteButtonPlaceholder: {
      width: 40,
      height: 40,
   },
   headerContent: {
      alignItems: 'center',
   },
   iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
   },
   eventTitle: {
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      paddingHorizontal: 20,
   },
   content: {
      flex: 1,
   },
   contentContainer: {
      padding: 20,
      paddingBottom: 40,
      flexGrow: 1,
   },
   section: {
      marginBottom: 24,
   },
   sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
   },
   sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
   },
   descriptionText: {
      fontSize: 15,
      lineHeight: 24,
      paddingLeft: 30,
   },
   infoRow: {
      paddingLeft: 30,
   },
   infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
   },
   infoText: {
      fontSize: 15,
      marginLeft: 10,
   },
   tagContainer: {
      paddingLeft: 30,
      flexDirection: 'row',
      flexWrap: 'wrap',
   },
   tag: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
   },
   tagText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
   },
   statusContainer: {
      paddingLeft: 30,
   },
   statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
   },
   statusActive: {
      backgroundColor: '#e8f5e9',
   },
   statusInactive: {
      backgroundColor: '#f5f7fa',
   },
   statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
   },
   statusDotActive: {
      backgroundColor: '#4caf50',
   },
   statusDotInactive: {
      backgroundColor: '#9aa7bd',
   },
   statusText: {
      fontSize: 14,
      fontWeight: '600',
   },
   statusTextActive: {
      color: '#2e7d32',
   },
   statusTextInactive: {
      color: '#5a6477',
   },
   participantsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
   },
   participantsContainer: {
      paddingLeft: 30,
      marginBottom: 12,
   },
   participantsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#e3f2fd',
      alignSelf: 'flex-start',
   },
   participantsText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1976d2',
      marginLeft: 8,
   },
   participantsListContainer: {
      paddingLeft: 30,
      marginTop: 8,
      paddingTop: 12,
   },
   participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      backgroundColor: '#f8f9fb',
      borderRadius: 10,
   },
   participantAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#e3f2fd',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
   },
   participantName: {
      fontSize: 15,
      fontWeight: '500',
      color: '#3a4257',
      flex: 1,
   },
   participantsListLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      gap: 10,
   },
   participantsListLoadingText: {
      fontSize: 14,
      color: '#9aa7bd',
   },
   participantsListEmpty: {
      paddingVertical: 20,
      alignItems: 'center',
   },
   participantsListEmptyText: {
      fontSize: 14,
      color: '#9aa7bd',
      fontStyle: 'italic',
   },
   actionSection: {
      marginTop: 8,
      marginBottom: 10,
   },
   joinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
   },
   joinButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
   },
   joinButtonDisabled: {
      opacity: 0.6,
   },
   joinButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      flex: 1,
      textAlign: 'center',
   },
   statusCompleted: {
      backgroundColor: '#e8f5e9',
   },
   statusUncompleted: {
      backgroundColor: '#ffebee',
   },
   statusDotCompleted: {
      backgroundColor: '#4caf50',
   },
   statusDotUncompleted: {
      backgroundColor: '#f44336',
   },
   statusTextCompleted: {
      color: '#2e7d32',
   },
   statusTextUncompleted: {
      color: '#c62828',
   },
   completionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
   },
   completionButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
   },
   completionButtonDisabled: {
      opacity: 0.6,
   },
   completionButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
   },
});

// Dark-theme overrides for the light-colored badges and participant rows
export const darkStyles = StyleSheet.create({
   statusActive: { backgroundColor: '#1d3326' },
   statusCompleted: { backgroundColor: '#1d3326' },
   statusInactive: { backgroundColor: '#252a38' },
   statusUncompleted: { backgroundColor: '#3a1f24' },
   statusTextActive: { color: '#81c784' },
   statusTextCompleted: { color: '#81c784' },
   statusTextInactive: { color: '#a0a8b8' },
   statusTextUncompleted: { color: '#ef9a9a' },
   participantsBadge: { backgroundColor: '#1e3a5f' },
   participantsText: { color: '#90caf9' },
   participantItem: { backgroundColor: '#252a38' },
   participantAvatar: { backgroundColor: '#1e3a5f' },
   participantName: { color: '#e8ecf0' },
});
