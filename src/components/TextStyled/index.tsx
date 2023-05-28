import { Text, TextProps } from 'react-native';

export const TextStyled = ({ children, className }: TextProps) => {
  return (
    <Text className={`light:text-zinc-950 dark:text-zinc-50 ${className ?? ''}`}>
      {children}
    </Text>
  );
}