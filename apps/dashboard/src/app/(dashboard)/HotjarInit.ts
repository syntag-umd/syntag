// components/HotjarInit.js
"use client";
import { useEffect } from 'react';
import Hotjar from '@hotjar/browser';

const HotjarInit = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const siteId = 5058306;
      const hotjarVersion = 6;

      Hotjar.init(siteId, hotjarVersion);
    }
  }, []);

  return null;
};

export default HotjarInit;
