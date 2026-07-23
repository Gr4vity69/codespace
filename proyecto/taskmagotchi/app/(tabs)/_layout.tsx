import { Tabs } from 'expo-router'
import { Text, type ColorValue } from 'react-native'
import { retroColors } from '../../src/components/retroUi'

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  const icons: Record<string, string> = {
    home: '⌂',
    tasks: '≣',
    pet: '◉',
    settings: '⚙',
  }
  return <Text style={{ fontSize: 20, color, fontWeight: '700' }}>{icons[name] || '●'}</Text>
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarActiveTintColor: retroColors.text,
      tabBarInactiveTintColor: 'rgba(255, 247, 232, 0.45)',
      tabBarStyle: {
        backgroundColor: retroColors.background,
        borderTopColor: retroColors.border,
        borderTopWidth: 2,
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
      },
      tabBarItemStyle: { marginHorizontal: 6, borderWidth: 2, borderColor: 'transparent', backgroundColor: retroColors.background, marginVertical: 2 },
      tabBarActiveBackgroundColor: retroColors.panel,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ color }) => <TabIcon name="tasks" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pet"
        options={{
          title: 'Mascota',
          tabBarIcon: ({ color }) => <TabIcon name="pet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  )
}
