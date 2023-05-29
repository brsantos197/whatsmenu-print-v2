import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Auth } from '../screens/Auth'
import { Home } from '../screens/Home'
import { Printer } from '../screens/Printer'

const { Navigator, Screen } = createNativeStackNavigator()

export const AppRoutes = () => {

  return (
    <Navigator screenOptions={{ headerShown: false, }}  >
      <Screen name="auth" component={Auth} />
      <Screen name="home" component={Home} />
      <Screen name="printer" component={Printer} />
    </Navigator>
  )
}