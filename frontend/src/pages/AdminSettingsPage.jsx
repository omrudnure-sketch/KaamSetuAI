import React from 'react';

export const AdminSettingsPage = () => {
  return (
    <div className="w-full space-y-space-md py-2 max-w-2xl">
      <h1 className="font-headline-sm text-xl font-bold text-on-surface">Admin System Settings</h1>

      <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
        <div className="font-label-md text-xs font-bold text-on-surface">Platform Role & Permission Configuration</div>
        <div className="text-xs text-on-surface-variant leading-relaxed">
          Admin permission rules are authoritatively managed server-side via <code>adminMiddleware.js</code> and checked on every request.
        </div>
      </div>
    </div>
  );
};
