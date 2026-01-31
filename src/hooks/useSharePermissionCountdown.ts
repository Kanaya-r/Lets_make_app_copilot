'use client';

import { useState, useEffect } from 'react';

/**
 * 共有登録許可のカウントダウンを管理するカスタムフック
 * 
 * AuthContextで毎秒更新すると全てのコンシューマーが再レンダリングされるため、
 * カウントダウンが必要なコンポーネント内でこのフックを使用することで、
 * 再レンダリングの範囲を限定する
 */
export function useSharePermissionCountdown(shareAllowedUntil: string | undefined) {
  const [remainingTime, setRemainingTime] = useState<number | null>(() => {
    if (!shareAllowedUntil) return null;
    const allowedUntil = new Date(shareAllowedUntil);
    if (isNaN(allowedUntil.getTime())) return null;
    const remainingMs = allowedUntil.getTime() - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : null;
  });

  useEffect(() => {
    const calculateRemainingTime = () => {
      if (!shareAllowedUntil) {
        return null;
      }
      
      const allowedUntil = new Date(shareAllowedUntil);
      // 無効な日時の場合
      if (isNaN(allowedUntil.getTime())) {
        return null;
      }
      
      const now = new Date();
      const remainingMs = allowedUntil.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        return null;
      }
      
      return Math.ceil(remainingMs / 1000);
    };

    // 初回と定期更新を統一的に処理
    let intervalId: NodeJS.Timeout | null = null;
    
    const update = () => {
      const newTime = calculateRemainingTime();
      setRemainingTime(newTime);
      
      // 期限切れになったらintervalをクリア
      if (newTime === null && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // 初回更新（非同期）
    const timeoutId = setTimeout(update, 0);
    
    // 有効期限がある場合のみ定期更新を設定
    if (shareAllowedUntil) {
      intervalId = setInterval(update, 1000);
    }

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [shareAllowedUntil]);

  const isActive = remainingTime !== null && remainingTime > 0;

  return {
    isActive,
    remainingTime,
  };
}
