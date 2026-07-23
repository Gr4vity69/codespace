import { Tabs } from 'expo-router'
import { Text, type ColorValue } from 'react-native'
import { retroColors } from '../../src/components/retroUi'

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  const icons: Record<string, string> = {
    home: '⌂',
    chat: '💬',
    agenda: '☰',
    shop: '◈',
    settings: '⚙',
  }
  return <Text style={{ fontSize: 20, color, fontWeight: '700' }}>{icons[name] || '●'}</Text>
}

export default function TabLayout() {
  return (
    <Tabs initialRouteName="home" screenOptions={{
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
      tabBarItemStyle: { marginHorizontal: 4, borderWidth: 2, borderColor: 'transparent', backgroundColor: retroColors.background, marginVertical: 2 },
      tabBarActiveBackgroundColor: retroColors.panel,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon name="chat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <TabIcon name="agenda" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color }) => <TabIcon name="shop" color={color} />,
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
