/* eslint-disable react/prop-types */
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingAnimation = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold tracking-wide text-slate-900">{message}</h3>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Initializing auction engine</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
