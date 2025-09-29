// Details.tsx
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Import types from hooks (adjust paths if needed)
import type { Assignee, Attachment, Task } from '@/hooks/useTasks';

export default function TaskDetailsScreen() {
  const { tasks, users: taskUsers, loadingTasks, loadingUsers: loadingTaskUsers, fetchTasks } = useTasks();
  const { currentUser, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const task = useMemo(() => tasks.find((t: Task) => t._id === id || t.id === id), [tasks, id]);

  // ✅ Simplified: Use resolved names from backend (no usersMap needed)
  const assigneeNames = useMemo(() => {
    return (task?.assignees || [])
      .map((assignee: Assignee) => {
        const name = assignee.name || 'Unknown';
        return assignee.id === currentUser?._id ? `You (${name})` : name;
      })
      .filter(Boolean)
      .join(', ') || 'None';
  }, [task?.assignees, currentUser]);

  // ✅ Use resolved user from backend
  const createdBy = useMemo(() => {
    const name = task?.user?.name || 'Unknown';
    const userId = task?.user?.id || task?.userId;
    return userId === currentUser?._id ? `You (${name})` : name;
  }, [task?.user, task?.userId, currentUser]);

  const [downloadingMap, setDownloadingMap] = useState<Record<string, { progress: number; busy: boolean; resumable?: FileSystem.DownloadResumable }>>({});

  useEffect(() => {
    setDownloadingMap({});
  }, [id]);

  if (loadingTasks || loadingTaskUsers || loadingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.text}>Loading task...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={fetchTasks}
          accessibilityLabel="Refresh tasks"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
        <Pressable
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/Task'))}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const getFileName = (att: Attachment, idx: number) => {
    if (att?.name) return att.name;
    if (att?.objectName) return att.objectName.split('/').pop() || `file-${idx}`;
    return `file-${idx}`;
  };

  // 🔹 Helper: Detect if file should open in tab (web) vs download
  const shouldOpenInTab = (att: Attachment) => {
    if (!att.contentType) return false; // Unknown type → download
    const lowerMime = att.contentType.toLowerCase();
    const lowerName = getFileName(att, 0).toLowerCase();
    // Open in tab for: images, PDFs, text, HTML
    return (
      lowerMime.startsWith('image/') ||
      lowerMime === 'application/pdf' ||
      lowerMime.startsWith('text/') ||
      lowerMime === 'text/plain' ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.html')
    );
  };

  const downloadAndOpen = useCallback(
    async (att: Attachment, idx: number) => {
      if (!att?.url) {
        Alert.alert('Attachment unavailable', 'This link is not available. Refresh tasks to get a new link.');
        return;
      }

      const baseFilename = getFileName(att, idx);
      const uniqueFilename = `${baseFilename}-${Date.now()}`; // Unique to prevent overwrites
      const stateKey = att.objectName || uniqueFilename;

      if (downloadingMap[stateKey]?.busy) {
        Alert.alert('Download in progress', 'Already downloading this file.');
        return;
      }

      setDownloadingMap((s) => ({ ...s, [stateKey]: { progress: 0, busy: true } }));

      let tmpUri: string | null = null;
      try {
        if (Platform.OS === 'web') {
          // 🔹 WEB: Open in new tab if viewable (like other web apps); else download
          if (shouldOpenInTab(att)) {
            const opened = window.open(att.url, '_blank');
            if (!opened) {
              // Popup blocked → fallback to download
              Alert.alert('Popup Blocked', 'Opening in new tab was blocked. Downloading instead...');
              // Fall through to download logic
            } else {
              console.log(`Opened ${baseFilename} in new tab`);
              return; // Success—no further action
            }
          }

          // Download fallback (for non-viewable or popup-blocked files)
          const response = await fetch(att.url);
          if (!response.ok) throw new Error('Failed to fetch file');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = uniqueFilename;
          document.body.appendChild(a); // Ensure it's in DOM for some browsers
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }

        // 🔹 MOBILE: Existing download/share/open logic (unchanged)
        tmpUri = FileSystem.cacheDirectory + uniqueFilename;
        const finalPath = FileSystem.documentDirectory + uniqueFilename;

        // ✅ Presigned URLs don't need auth headers
        const downloadResumable = FileSystem.createDownloadResumable(
          att.url,
          tmpUri,
          {}, // No auth needed for presigned URLs
          (progress) => {
            let pct = 0;
            if (progress.totalBytesExpectedToWrite > 0) {
              pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
            }
            setDownloadingMap((s) => ({ ...s, [stateKey]: { progress: pct, busy: true, resumable: downloadResumable } }));
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (!result?.uri) throw new Error('Download failed');

        await FileSystem.copyAsync({ from: result.uri, to: finalPath });

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(finalPath);
        } else {
          Alert.alert('Permission Denied', 'File downloaded but not saved to library. You can still open/share it.');
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(finalPath, { mimeType: att.contentType || undefined });
        } else {
          if (await Linking.canOpenURL(finalPath)) {
            await Linking.openURL(finalPath);
          } else {
            Alert.alert('Downloaded', `Saved to ${finalPath}`);
          }
        }
      } catch (err: any) {
        console.error('Download error:', err);
        Alert.alert('Download failed', err?.message || 'Could not download file. Check your network connection.');
      } finally {
        if (tmpUri) {
          await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(console.warn);
        }
        setDownloadingMap((s) => ({
          ...s,
          [stateKey]: { ...(s[stateKey] || {}), busy: false, progress: 0, resumable: undefined },
        }));
      }
    },
    [downloadingMap]
  );

  const renderAttachments = (attachments: Attachment[] = []) => {
    if (!attachments.length) {
      return <Text style={styles.text}>No files attached</Text>;
    }
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Attachments:</Text>
        {attachments.map((att, idx) => {
          const name = getFileName(att, idx);
          const lowerName = name.toLowerCase();
          const mime = att.contentType?.toLowerCase() || '';
          const isImage =
            mime.startsWith('image/') ||
            lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.gif') ||
            lowerName.endsWith('.webp');
          const stateKey = att.objectName || name;
          const status = downloadingMap[stateKey] || { progress: 0, busy: false };

          return (
            <View key={idx} style={styles.attachment}>
              {isImage && att?.url ? (
                <Pressable 
                  onPress={() => downloadAndOpen(att, idx)} 
                  accessibilityLabel={`View or download image ${name}`}
                >
                  <Image source={{ uri: att.url }} style={styles.image} resizeMode="cover" />
                </Pressable>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.text, { flex: 1 }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {status.busy ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" />
                      {status.progress > 0 ? (
                        <Text style={{ marginLeft: 8 }}>{Math.round(status.progress * 100)}%</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => downloadAndOpen(att, idx)}
                      style={styles.downloadButton}
                      accessibilityLabel={`Download file ${name}`}
                    >
                      <Text style={styles.downloadText}>📥 {shouldOpenInTab(att) ? 'View' : 'Download'}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {!currentUser && (
        <Text style={styles.infoText}>Log in to see personalized details (e.g., if this task is assigned to you).</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.text}>{task.description || 'No description'}</Text>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.text}>{task.status || 'Pending'}</Text>
        <Text style={styles.label}>Priority:</Text>
        <Text style={styles.text}>{task.priority || 'Unknown'}</Text>
        <Text style={styles.label}>Due Date:</Text>
        <Text style={styles.text}>
          {task.dueDate ? new Intl.DateTimeFormat('default', { dateStyle: 'medium' }).format(new Date(task.dueDate)) : '—'}
        </Text>
        <Text style={styles.label}>Assignees:</Text>
        <Text style={styles.text}>{assigneeNames}</Text>
        <Text style={styles.label}>Created By:</Text>
        <Text style={styles.text}>{createdBy}</Text>

        {renderAttachments(task.attachments || [])}
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/Task'))}
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12 },
  text: { fontSize: 14, color: '#666', marginTop: 4 },
  section: { marginTop: 12 },
  attachment: { marginVertical: 8 },
  image: { width: 120, height: 120, borderRadius: 6 },
  downloadButton: { padding: 8, backgroundColor: '#e9ecef', borderRadius: 6 },
  downloadText: { color: '#007bff', fontSize: 14, fontWeight: '500' },
  errorText: { textAlign: 'center', fontSize: 16, color: '#dc3545', marginTop: 20 },
  backButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  backButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  infoText: { fontSize: 14, color: '#007bff', textAlign: 'center', marginBottom: 16 },
  // 🔹 NEW: Refresh button style
  refreshButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});