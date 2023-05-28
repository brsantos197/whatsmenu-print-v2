import { TextInput, TextInputProps, useColorScheme } from 'react-native';
import colors from 'tailwindcss/colors'
export const Input = ({ className, ...rest }: TextInputProps) => {
  const colorScheme = useColorScheme()
  return (
    <TextInput placeholderTextColor={colorScheme === 'dark' ? colors.zinc[400] : colors.zinc[400]} className={`p-4 mb-4 border rounded focus:border-green-500 light:text-zinc-950 light:border-zinc-200 light:bg-zinc-200 dark:text-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 ${className ?? ''}`}  {...rest} />
  );
}