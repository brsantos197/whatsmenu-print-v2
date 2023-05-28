import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Auth } from '../screens/Auth'
import { Home } from '../screens/Home'

const { Navigator, Screen } = createNativeStackNavigator()

export const AppRoutes = () => {

  return (
    <Navigator screenOptions={{ headerShown: false, }}  >
      <Screen name="auth" component={Auth} />
      <Screen name="home" component={Home} />
    </Navigator>
  )
}