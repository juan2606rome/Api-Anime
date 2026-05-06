import { Tabs } from 'expo-router'

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    height: 60
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    marginBottom: 5
                }
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Saint Seiya' }} />
            <Tabs.Screen name="hunterxhunter" options={{ title: 'Hunter X Hunter' }} />
            <Tabs.Screen name="onepiece" options={{ title: 'One Piece' }} />
            {/* los name es de los nombres de los archivos, no de los nombres del export default function */}
            {/* y el primero es obligatorio que sea index porque expo router busca el index */}
        </Tabs>
    )
}