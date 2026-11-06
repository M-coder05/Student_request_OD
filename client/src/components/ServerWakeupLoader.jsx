import React, { useEffect, useState } from 'react';
import { getInitialRequestState, subscribeToInitialRequest } from '../api/client';

export default function ServerWakeupLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    const updateVisibility = () => {
      clearTimeout(timer);
      if (!getInitialRequestState().pending) {
        setVisible(false);
        return;
      }

      timer = setTimeout(() => {
        if (getInitialRequestState().pending) {
          setVisible(true);
        }
      }, 3000);
    };

    const unsubscribe = subscribeToInitialRequest(updateVisibility);
    updateVisibility();

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="server-wakeup" role="status" aria-live="polite">
      <span className="server-wakeup-spinner" aria-hidden="true" />
      <p>Waking up the server…</p>
    </div>
  );
}
