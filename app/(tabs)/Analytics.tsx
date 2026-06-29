// app/(tabs)/Analytics.tsx
import { useTasks } from '@/hooks/useTasks';
import { useTheme } from '@/providers/ThemeProvider';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Conditional import
let Recharts: any = null;
let BarChartRN: any = null;
if (Platform.OS === 'web') {
  Recharts = require('recharts');
} else {
  BarChartRN = require('react-native-chart-kit').BarChart;
}

export default function AnalyticsScreen() {
  const { tasks } = useTasks();
  const { theme } = useTheme();

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { pending: 0, 'in-progress': 0, completed: 0 };
    const byPriority: Record<string, number> = { urgent: 0, medium: 0, low: 0 };
    (tasks || []).forEach((t: any) => {
      const s = t.status ?? 'pending';
      byStatus[s] = (byStatus[s] || 0) + 1;
      const p = t.priority ?? 'medium';
      byPriority[p] = (byPriority[p] || 0) + 1;
    });
    return { byStatus, byPriority };
  }, [tasks]);

  const textColor = theme === 'dark' ? '#eee' : '#222';
  const bg = theme === 'dark' ? '#0f0f0f' : '#fff';

  // ---- WEB (recharts) ----
  if (Platform.OS === 'web' && Recharts) {
    const { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar } = Recharts;
    const data = [
      { name: 'To Do', count: counts.byStatus.pending },
      { name: 'In Progress', count: counts.byStatus['in-progress'] },
      { name: 'Done', count: counts.byStatus.completed },
    ];
    return (
      <div style={{ padding: 16, background: bg, minHeight: '100%' }}>
        <h2 style={{ color: textColor }}>Task Analytics</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: textColor }}>Priority breakdown</h3>
          <ul style={{ color: textColor }}>
            <li>Urgent: {counts.byPriority.urgent}</li>
            <li>Medium: {counts.byPriority.medium}</li>
            <li>Low: {counts.byPriority.low}</li>
          </ul>
        </div>
      </div>
    );
  }

  // ---- NATIVE (react-native-chart-kit) ----
  if (BarChartRN) {
    const chartData = {
      labels: ['To Do', 'In Progress', 'Done'],
      datasets: [{ data: [counts.byStatus.pending, counts.byStatus['in-progress'], counts.byStatus.completed] }],
    };
    const screenWidth = 350;
    return (
      <ScrollView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.title, { color: textColor }]}>Task Analytics</Text>
        <BarChartRN
          data={chartData}
          width={screenWidth}
          height={220}
          fromZero
          showValuesOnTopOfBars
          chartConfig={{
            backgroundGradientFrom: bg,
            backgroundGradientTo: bg,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(136,132,216, ${opacity})`,
            labelColor: () => textColor,
          }}
        />
        <View style={{ padding: 16 }}>
          <Text style={{ color: textColor, fontWeight: '700', marginBottom: 8 }}>Priority breakdown</Text>
          <Text style={{ color: textColor }}>Urgent: {counts.byPriority.urgent}</Text>
          <Text style={{ color: textColor }}>Medium: {counts.byPriority.medium}</Text>
          <Text style={{ color: textColor }}>Low: {counts.byPriority.low}</Text>
        </View>
      </ScrollView>
    );
  }

  // ---- Fallback ----
  return (
    <View style={[styles.container, { backgroundColor: bg, padding: 16 }]}>
      <Text style={[styles.title, { color: textColor }]}>Task Analytics</Text>
      <Text style={{ color: textColor, marginTop: 12 }}>To Do: {counts.byStatus.pending}</Text>
      <Text style={{ color: textColor }}>In Progress: {counts.byStatus['in-progress']}</Text>
      <Text style={{ color: textColor }}>Done: {counts.byStatus.completed}</Text>
      <Text style={{ color: textColor, marginTop: 12, fontWeight: '700' }}>Priority</Text>
      <Text style={{ color: textColor }}>Urgent: {counts.byPriority.urgent}</Text>
      <Text style={{ color: textColor }}>Medium: {counts.byPriority.medium}</Text>
      <Text style={{ color: textColor }}>Low: {counts.byPriority.low}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', margin: 12 },
});
