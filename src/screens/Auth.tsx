import { useState, useEffect } from "react";
import { View, BackHandler } from 'react-native';

import { useNavigation } from "@react-navigation/native";

import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { Input } from '../components/Input';
import { api } from "../lib/axios";
import { getUser, setUser } from "../storage/user";
import { Loading } from "../components/Loading";
import { Button } from "../components/Button";

export const Auth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loaded, setLoaded] = useState(false)

  const { navigate, reset } = useNavigation()

  const handleAuth = async () => {
    try {
      const { data } = await api.post('/api/v2/auth/app/print', {
        email,
        password
      })
      await setUser(data.user)
      const user = await getUser()
      if (user) {
        navigate('printers', { user })
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    getUser()
      .then(user => {
        if (user) {
          navigate('printers', { user })
          setLoaded(true)
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  return (
    <Page className='gap-y-36'>
      <TextStyled className='mt-40 text-green-500 text-5xl font-bold'>WhatsMenu</TextStyled>
      <View className='w-screen px-10'>
        <Input placeholder='Email' autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={(text) => setEmail(text)} />
        <Input placeholder='Senha' secureTextEntry value={password} onChangeText={(text) => setPassword(text)} />
        <Button
          onPress={() => { handleAuth() }}
          className='bg-green-500 p-4 rounded-md items-center justify-items-center'
        >
          <TextStyled className='text-lg'>Logar</TextStyled>
        </Button>
      </View>
    </Page>
  );
}