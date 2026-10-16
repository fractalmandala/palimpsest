import type { ImgHTMLAttributes } from 'react';
import iconUrl from '../assets/palimpsest-icon.png';

export function PsIcon({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt?: string }) {
  return <img src={iconUrl} alt={alt ?? 'Palimpsest icon'} {...props} />;
}
