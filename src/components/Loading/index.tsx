import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { TextStyled } from '../TextStyled';

export const Loading = () => {
  return (
    <SafeAreaView className='z-10 absolute inset-0 top-6 h-screen w-screen backdrop-opacity-50 items-center justify-items-end bg-zinc-950/40 dark:bg-zinc-100/40'>
      <View className='my-auto items-center'>
        {/* <View className='animate-spin rounded-full border-8 border-t-green-500  w-40 h-40 ' ></View> */}
        <TextStyled className='text-green-500 text-3xl font-bold'>Carregando...</TextStyled>
      </View>
    </SafeAreaView>
  );
}