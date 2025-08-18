import { type TamaguiProviderProps } from '@my/ui';
export declare function Provider({ children, defaultTheme, ...rest }: Omit<TamaguiProviderProps, 'config'> & {
    defaultTheme?: string;
}): import("react/jsx-runtime").JSX.Element;
